import crypto from "crypto";
import path from "path";
import fs from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getImageDimensions } from "@/lib/images";

export const dynamic = "force-dynamic";

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/png",
]);

const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3 MB

/**
 * POST /api/admin/banners/upload
 * Validates format (jpg/webp/png), max 3 MB, and minimum dimensions:
 * - Desktop: width >= 1600px
 * - Mobile: width >= 800px
 * Uploads to Cloudinary (if configured) or local storage with public URL.
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

    // 2. Validate file size (max 3 MB)
    if (file.size > MAX_FILE_SIZE) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      return NextResponse.json(
        {
          error: `File size exceeds the 3 MB limit. Uploaded file is ${sizeMB} MB.`,
        },
        { status: 400 },
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 3. Validate image dimensions
    const dimensions = getImageDimensions(buffer);
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

    const cloudName =
      process.env.CLOUDINARY_CLOUD_NAME ||
      process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;

    // 4. Cloudinary Upload if credentials present
    if (cloudName && ((apiSecret && apiKey) || uploadPreset)) {
      const timestamp = Math.round(Date.now() / 1000);
      const base64Data = `data:${file.type};base64,${buffer.toString("base64")}`;
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

      if (!cldRes.ok) {
        const errorData = await cldRes.json().catch(() => ({}));
        console.error("Cloudinary banner upload error:", errorData);
        return NextResponse.json(
          {
            error:
              errorData.error?.message || "Failed to upload image to Cloudinary",
          },
          { status: 502 },
        );
      }

      const cldData = await cldRes.json();
      return NextResponse.json({
        success: true,
        url: cldData.secure_url || cldData.url,
        publicId: cldData.public_id,
        width: cldData.width || dimensions.width,
        height: cldData.height || dimensions.height,
        format: cldData.format || dimensions.type,
      });
    }

    // 5. Local File Storage Fallback (for local development and offline environments)
    const uploadsDir = path.join(process.cwd(), "public", "uploads", "banners");
    await fs.mkdir(uploadsDir, { recursive: true });

    const ext = dimensions.type === "jpeg" ? "jpg" : dimensions.type;
    const filename = `banner-${Date.now()}-${crypto.randomBytes(4).toString("hex")}.${ext}`;
    const filePath = path.join(uploadsDir, filename);

    await fs.writeFile(filePath, buffer);

    const relativeUrl = `/uploads/banners/${filename}`;
    return NextResponse.json({
      success: true,
      url: relativeUrl,
      width: dimensions.width,
      height: dimensions.height,
      format: dimensions.type,
    });
  } catch (error) {
    console.error("[POST /api/admin/banners/upload] Error:", error);
    return NextResponse.json(
      { error: "Internal server error during banner image upload" },
      { status: 500 },
    );
  }
}

