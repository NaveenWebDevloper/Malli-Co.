import crypto from "crypto";
import path from "path";
import fs from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { Media } from "@/models/Media";
import { getImageDimensions } from "@/lib/images";
import { isR2Configured, uploadToR2 } from "@/lib/r2";
import { isImageKitConfigured, uploadToImageKit } from "@/lib/imagekit";
import { compressImage } from "@/lib/image-compress";

export const dynamic = "force-dynamic";

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/png",
]);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB limit (we compress on upload)

/**
 * POST /api/admin/banners/upload
 * Validates format (jpg/webp/png), max file size, and minimum dimensions:
 * - Desktop: width >= 1600px
 * - Mobile: width >= 800px
 * Compresses with sharp to WebP.
 * Uploads to ImageKit (top priority) -> R2 -> Cloudinary -> MongoDB Media.
 * Protected: Admin only (Rule 7)
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Forbidden: Admin role required" },
      { status: 403 },
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const targetType = (formData.get("type") as string) || "desktop"; // "desktop" | "mobile"

    if (!file) {
      return NextResponse.json(
        { error: "No image file provided" },
        { status: 400 },
      );
    }

    // 1. Validate file format
    if (!ALLOWED_MIME_TYPES.has(file.type.toLowerCase())) {
      return NextResponse.json(
        {
          error:
            "Invalid file format. Only JPEG (.jpg, .jpeg), WebP (.webp), and PNG (.png) images are permitted.",
        },
        { status: 400 },
      );
    }

    // 2. Validate file size
    if (file.size > MAX_FILE_SIZE) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      return NextResponse.json(
        {
          error: `File size exceeds the 10 MB limit. Uploaded file is ${sizeMB} MB.`,
        },
        { status: 400 },
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const rawBuffer = Buffer.from(arrayBuffer);

    // 3. Validate image dimensions before compression
    const dimensions = getImageDimensions(rawBuffer);
    if (!dimensions) {
      return NextResponse.json(
        {
          error:
            "Unable to parse image header dimensions. Please ensure the file is a valid image.",
        },
        { status: 400 },
      );
    }

    const minWidth = targetType === "mobile" ? 800 : 1600;
    if (dimensions.width < minWidth) {
      return NextResponse.json(
        {
          error: `${targetType === "mobile" ? "Mobile" : "Desktop"} banner image must be at least ${minWidth}px wide. The uploaded image is only ${dimensions.width}px wide.`,
        },
        { status: 400 },
      );
    }

    // 4. Compress banner image with Sharp (WebP @ 85% quality, maxWidth: 2400 for desktop, 1200 for mobile)
    const compressed = await compressImage(rawBuffer, {
      maxWidth: targetType === "mobile" ? 1200 : 2400,
      quality: 85,
      format: "webp",
    });

    const activeBuffer = compressed.buffer;
    const finalWidth = compressed.width || dimensions.width;
    const finalHeight = compressed.height || dimensions.height;
    const bannerFilename = `banner-${Date.now()}-${crypto.randomBytes(4).toString("hex")}.webp`;

    // 5. ImageKit Upload (Top Priority)
    if (isImageKitConfigured()) {
      const ikResult = await uploadToImageKit({
        buffer: activeBuffer,
        fileName: bannerFilename,
        folder: "/banners",
        tags: ["banners", targetType],
      });

      if (ikResult.success) {
        return NextResponse.json({
          success: true,
          url: ikResult.url,
          publicId: ikResult.fileId || ikResult.name,
          width: ikResult.width || finalWidth,
          height: ikResult.height || finalHeight,
          format: "webp",
          provider: "imagekit",
          storage: "imagekit",
          originalSize: rawBuffer.length,
          size: ikResult.size || activeBuffer.length,
        });
      }

      console.warn("[POST /api/admin/banners/upload] ImageKit upload failed, falling back:", ikResult.error);
    }

    // 6. Cloudflare R2 Upload (Secondary Cloud Storage)
    if (isR2Configured()) {
      const bannerKey = `banners/${bannerFilename}`;
      const r2Result = await uploadToR2({
        buffer: activeBuffer,
        key: bannerKey,
        contentType: "image/webp",
      });

      if (r2Result.success) {
        return NextResponse.json({
          success: true,
          url: r2Result.url,
          publicId: r2Result.key,
          width: finalWidth,
          height: finalHeight,
          format: "webp",
          provider: "cloudflare-r2",
          storage: "r2",
        });
      }

      console.warn("[POST /api/admin/banners/upload] R2 upload failed, falling back:", r2Result.error);
    }

    const cloudName =
      process.env.CLOUDINARY_CLOUD_NAME ||
      process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;

    // 7. Cloudinary Upload if credentials present
    if (cloudName && ((apiSecret && apiKey) || uploadPreset)) {
      try {
        const timestamp = Math.round(Date.now() / 1000);
        const base64Data = `data:image/webp;base64,${activeBuffer.toString("base64")}`;
        const uploadFormData = new FormData();
        uploadFormData.append("file", base64Data);
        uploadFormData.append("folder", "banners");

        if (uploadPreset) {
          uploadFormData.append("upload_preset", uploadPreset);
        } else if (apiKey && apiSecret) {
          uploadFormData.append("api_key", apiKey);
          uploadFormData.append("timestamp", timestamp.toString());

          const paramsToSign = `folder=banners&timestamp=${timestamp}${apiSecret}`;
          const signature = crypto
            .createHash("sha1")
            .update(paramsToSign)
            .digest("hex");
          uploadFormData.append("signature", signature);
        }

        const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
        const cldRes = await fetch(uploadUrl, {
          method: "POST",
          body: uploadFormData,
        });

        if (cldRes.ok) {
          const cldData = await cldRes.json();
          return NextResponse.json({
            success: true,
            url: cldData.secure_url || cldData.url,
            publicId: cldData.public_id,
            width: cldData.width || finalWidth,
            height: cldData.height || finalHeight,
            format: cldData.format || "webp",
            provider: "cloudinary",
            storage: "cloudinary",
          });
        }
      } catch (cldErr) {
        console.warn("[POST /api/admin/banners/upload] Cloudinary error, falling back:", cldErr);
      }
    }

    // 8. Database Storage Fallback for Vercel / Serverless (Stores compressed WebP buffer)
    const saveBannerToMongoDB = async () => {
      await connectDB();
      const mediaDoc = await Media.create({
        filename: bannerFilename,
        contentType: "image/webp",
        size: activeBuffer.length,
        data: activeBuffer,
      });

      return NextResponse.json({
        success: true,
        url: `/api/media/${mediaDoc._id}.webp`,
        publicId: mediaDoc._id.toString(),
        width: finalWidth,
        height: finalHeight,
        format: "webp",
        provider: "mongodb-media",
        storage: "mongodb",
        originalSize: rawBuffer.length,
        size: activeBuffer.length,
        compressionRatio: compressed.compressionRatio,
        note: `Stored in MongoDB as compressed WebP (${Math.round(compressed.compressionRatio * 100)}% smaller)`,
      });
    };

    if (process.env.VERCEL) {
      return await saveBannerToMongoDB();
    }

    // 9. Local File Storage Fallback (for local development with writable disk)
    try {
      const uploadsDir = path.join(process.cwd(), "public", "uploads", "banners");
      await fs.mkdir(uploadsDir, { recursive: true });

      const filePath = path.join(uploadsDir, bannerFilename);
      await fs.writeFile(filePath, activeBuffer);

      const relativeUrl = `/uploads/banners/${bannerFilename}`;
      return NextResponse.json({
        success: true,
        url: relativeUrl,
        width: finalWidth,
        height: finalHeight,
        format: "webp",
        provider: "local-fs",
        storage: "local",
      });
    } catch (fsErr) {
      console.warn("Banner local disk write failed, falling back to MongoDB Media storage:", fsErr);
      return await saveBannerToMongoDB();
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Banner image upload failed";
    console.error("[POST /api/admin/banners/upload] Error:", error);
    return NextResponse.json(
      { error: msg },
      { status: 500 },
    );
  }
}
