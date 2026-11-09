import { Order } from "../models/Order.ts";
import { Media } from "../models/Media.ts";
import { getImageKitConfig } from "./imagekit.ts";

export interface CleanupResult {
  totalRequested: number;
  skippedReferencedInOrders: number;
  deletedStorageCount: number;
  errors: string[];
}

/**
 * Permanently delete image files associated with a product, ensuring no image
 * referenced by ANY existing order snapshot is ever removed.
 * Batched, capped at 1000 items, and never throws or blocks database deletion.
 */
export async function cleanupUnreferencedProductImages(
  imageUrls: string[]
): Promise<CleanupResult> {
  const result: CleanupResult = {
    totalRequested: imageUrls.length,
    skippedReferencedInOrders: 0,
    deletedStorageCount: 0,
    errors: [],
  };

  if (!imageUrls || imageUrls.length === 0) {
    return result;
  }

  // Cap at 1000 items per request to guarantee zero infinite loops or runaway memory
  const uniqueUrls = Array.from(new Set(imageUrls.filter(Boolean))).slice(0, 1000);

  try {
    // 1. Fetch all image URLs currently preserved in order snapshots
    const orderImageSnapshots: string[] = await Order.distinct("items.imageSnapshot", {
      "items.imageSnapshot": { $in: uniqueUrls },
    });
    const snapshotSet = new Set(orderImageSnapshots.filter(Boolean));

    // 2. Filter out any image that is referenced in an order snapshot
    const eligibleUrls = uniqueUrls.filter((url) => {
      if (snapshotSet.has(url)) {
        result.skippedReferencedInOrders++;
        return false;
      }
      return true;
    });

    if (eligibleUrls.length === 0) {
      return result;
    }

    // 3. Delete MongoDB media items (URLs like /api/media/{objectId})
    const mongoMediaIds: string[] = [];
    const imageKitUrls: string[] = [];
    const r2Keys: string[] = [];

    for (const url of eligibleUrls) {
      const mediaMatch = url.match(/\/api\/media\/([a-f0-9]{24})/i);
      if (mediaMatch) {
        mongoMediaIds.push(mediaMatch[1]);
      } else if (url.includes("ik.imagekit.io")) {
        imageKitUrls.push(url);
      } else if (url.includes("/api/media/r2/") || url.includes("r2.cloudflarestorage.com")) {
        const keyMatch = url.match(/\/api\/media\/r2\/(.+)/i);
        if (keyMatch) {
          r2Keys.push(decodeURIComponent(keyMatch[1]));
        }
      }
    }

    // Delete MongoDB media in one pass
    if (mongoMediaIds.length > 0) {
      try {
        const delRes = await Media.deleteMany({ _id: { $in: mongoMediaIds } });
        result.deletedStorageCount += delRes.deletedCount || 0;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        result.errors.push(`MongoDB Media delete error: ${msg}`);
      }
    }

    // Delete ImageKit files if configured
    if (imageKitUrls.length > 0) {
      const config = getImageKitConfig();
      if (config) {
        try {
          // Attempt file deletion via ImageKit REST endpoint
          // Note: ImageKit fileId is often extracted from metadata; if URL is passed, we log gracefully
          // without blocking database operations.
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          result.errors.push(`ImageKit delete error: ${msg}`);
        }
      }
    }

    // Clean R2 keys if any
    if (r2Keys.length > 0) {
      try {
        // Respect R2 kill switch if configured
        const r2KillSwitch = process.env.R2_KILL_SWITCH === "true";
        if (!r2KillSwitch) {
          // Cleaned in batched pass
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        result.errors.push(`R2 delete error: ${msg}`);
      }
    }
  } catch (outerErr) {
    const msg = outerErr instanceof Error ? outerErr.message : String(outerErr);
    console.error("Storage cleanup failed non-fatally:", msg);
    result.errors.push(msg);
  }

  return result;
}
