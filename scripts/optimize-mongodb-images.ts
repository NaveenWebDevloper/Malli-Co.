import fs from "fs";
import path from "path";
import { connectDB } from "../lib/db.ts";
import { Media } from "../models/Media.ts";
import { compressImage } from "../lib/image-compress.ts";
import { isImageKitConfigured, uploadToImageKit } from "../lib/imagekit.ts";

function loadEnv() {
  if (process.env.MONGODB_URI || process.env.MONGODB_DIRECT_URI) return;

  const envFiles = [".env.local", ".env"];
  for (const file of envFiles) {
    const fullPath = path.resolve(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, "utf-8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const [key, ...rest] = trimmed.split("=");
        if (key && rest.length > 0) {
          const val = rest.join("=").replace(/^["'](.*)["']$/, "$1");
          if (!process.env[key.trim()]) {
            process.env[key.trim()] = val.trim();
          }
        }
      }
      break;
    }
  }
}

loadEnv();

async function runOptimization() {
  console.log("=== Malli & Co. MongoDB Media Optimization ===");
  console.log("ImageKit Configured:", isImageKitConfigured());

  await connectDB();
  const allMedia = await Media.find({}).sort({ createdAt: -1 });

  console.log(`Found ${allMedia.length} media documents in MongoDB.\n`);

  if (allMedia.length === 0) {
    console.log("No images found in MongoDB. Database is clean!");
    process.exit(0);
  }

  let totalOriginalBytes = 0;
  let totalOptimizedBytes = 0;
  let optimizedCount = 0;
  let skippedCount = 0;

  for (let i = 0; i < allMedia.length; i++) {
    const doc = allMedia[i];
    const rawBuffer = Buffer.isBuffer(doc.data)
      ? doc.data
      : Buffer.from((doc.data as unknown as { buffer: ArrayBuffer }).buffer || doc.data);

    const originalSize = rawBuffer.length;
    totalOriginalBytes += originalSize;

    // If it's already WebP and under 250 KB, skip
    if (doc.contentType === "image/webp" && originalSize < 250 * 1024) {
      console.log(`[${i + 1}/${allMedia.length}] SKIP: ${doc.filename} already optimized (${(originalSize / 1024).toFixed(1)} KB)`);
      totalOptimizedBytes += originalSize;
      skippedCount++;
      continue;
    }

    console.log(`[${i + 1}/${allMedia.length}] Compressing: ${doc.filename} (${(originalSize / 1024).toFixed(1)} KB)...`);

    try {
      const compressed = await compressImage(rawBuffer, {
        maxWidth: 1600,
        quality: 80,
        format: "webp",
      });

      const newSize = compressed.buffer.length;
      totalOptimizedBytes += newSize;
      const savingsPct = Math.round((1 - newSize / originalSize) * 100);

      doc.data = compressed.buffer;
      doc.size = newSize;
      doc.contentType = "image/webp";
      if (!doc.filename.endsWith(".webp")) {
        doc.filename = doc.filename.replace(/\.[^/.]+$/, "") + ".webp";
      }

      await doc.save();
      optimizedCount++;

      console.log(`   -> OK: ${(originalSize / 1024).toFixed(1)} KB -> ${(newSize / 1024).toFixed(1)} KB (${savingsPct}% saved)`);

      // If ImageKit is configured, optionally upload to ImageKit as well
      if (isImageKitConfigured()) {
        const ikRes = await uploadToImageKit({
          buffer: compressed.buffer,
          fileName: doc.filename,
          folder: "/migrated-media",
          tags: ["migrated", "mongodb"],
        });
        if (ikRes.success) {
          console.log(`   -> Uploaded to ImageKit CDN: ${ikRes.url}`);
        }
      }
    } catch (err) {
      console.error(`   -> FAILED to compress ${doc.filename}:`, err);
      totalOptimizedBytes += originalSize;
    }
  }

  const savedBytes = totalOriginalBytes - totalOptimizedBytes;
  const overallSavingsPct = totalOriginalBytes > 0
    ? Math.round((savedBytes / totalOriginalBytes) * 100)
    : 0;

  console.log("\n================ SUMMARY ================");
  console.log(`Total Images Evaluated: ${allMedia.length}`);
  console.log(`Optimized: ${optimizedCount}`);
  console.log(`Already Optimal / Skipped: ${skippedCount}`);
  console.log(`Original DB Storage: ${(totalOriginalBytes / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`New DB Storage:      ${(totalOptimizedBytes / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`Total Space Freed:   ${(savedBytes / (1024 * 1024)).toFixed(2)} MB (${overallSavingsPct}% reduction)`);
  console.log("=========================================\n");

  process.exit(0);
}

runOptimization().catch((err) => {
  console.error("Optimization script error:", err);
  process.exit(1);
});

