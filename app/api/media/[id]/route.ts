import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { Media } from "@/models/Media";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/media/[id]
 * Public endpoint to stream uploaded media from MongoDB.
 * Cached aggressively with Cache-Control: public, max-age=31536000, immutable.
 */
export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    // Strip optional file extension (e.g., 672f...jpg -> 672f...)
    const cleanId = id.replace(/\.[a-zA-Z0-9]+$/, "");

    if (!mongoose.Types.ObjectId.isValid(cleanId)) {
      return NextResponse.json({ error: "Invalid media ID" }, { status: 400 });
    }

    await connectDB();
    const media = await Media.findById(cleanId).lean();

    if (!media || !media.data) {
      return NextResponse.json({ error: "Media not found" }, { status: 404 });
    }

    // Convert BSON binary/Buffer to Uint8Array for Response BodyInit
    const rawBuffer = Buffer.isBuffer(media.data)
      ? media.data
      : Buffer.from((media.data as unknown as { buffer: ArrayBuffer }).buffer || media.data);

    const bodyBytes = new Uint8Array(rawBuffer);

    return new NextResponse(bodyBytes, {
      status: 200,
      headers: {
        "Content-Type": media.contentType || "image/jpeg",
        "Content-Length": rawBuffer.length.toString(),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error retrieving media";
    console.error("[GET /api/media/[id]] Error:", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
