import crypto from "crypto";
import path from "path";
import fs from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // Rule 7: Admin verification
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

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const cloudName =
      process.env.CLOUDINARY_CLOUD_NAME ||
      process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Data = `data:${file.type};base64,${buffer.toString("base64")}`;

    // If Cloudinary credentials are fully configured, upload directly to Cloudinary REST API
    if (cloudName && ((apiSecret && apiKey) || uploadPreset)) {
      const timestamp = Math.round(Date.now() / 1000);
      const uploadFormData = new FormData();
      uploadFormData.append("file", base64Data);

      if (uploadPreset) {
        uploadFormData.append("upload_preset", uploadPreset);
      } else if (apiKey && apiSecret) {
        uploadFormData.append("api_key", apiKey);
        uploadFormData.append("timestamp", timestamp.toString());

        // Signature generation: sha1(params + apiSecret)
        const paramsToSign = `timestamp=${timestamp}${apiSecret}`;
        const signature = crypto
          .createHash("sha1")
          .update(paramsToSign)
          .digest("hex");
        uploadFormData.append("signature", signature);
      }

      const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
      const response = await fetch(uploadUrl, {
        method: "POST",
        body: uploadFormData,
      });

      if (response.ok) {
        const result = await response.json();
        return NextResponse.json({
          url: result.secure_url || result.url,
          publicId: result.public_id,
          format: result.format,
        });
      }

      const errorText = await response.text();
      console.warn("Cloudinary upload rejected, falling back to local storage:", errorText);
    }

    // Local Storage Fallback: Write file to public/uploads/products
    const uploadDir = path.join(process.cwd(), "public", "uploads", "products");
    await fs.mkdir(uploadDir, { recursive: true });

    const ext =
      path.extname(file.name) ||
      (file.type === "image/png"
        ? ".png"
        : file.type === "image/webp"
          ? ".webp"
          : ".jpg");
    const rawBaseName = path.basename(file.name, ext);
    const safeBaseName = rawBaseName.replace(/[^a-zA-Z0-9_-]/g, "_") || "img";
    const uniqueFileName = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${safeBaseName}${ext}`;
    const filePath = path.join(uploadDir, uniqueFileName);

    await fs.writeFile(filePath, buffer);

    const localUrl = `/uploads/products/${uniqueFileName}`;

    return NextResponse.json({
      url: localUrl,
      publicId: `local_${Date.now()}`,
      format: ext.replace(".", ""),
      note: "Saved to local storage (/uploads/products/)",
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Upload processing failed";
    console.error("Image upload exception:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
