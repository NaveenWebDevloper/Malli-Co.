import { NextRequest, NextResponse } from "next/server";
import { getFromR2 } from "@/lib/r2";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ key: string[] }>;
}

/**
 * GET /api/media/r2/[...key]
 * Public proxy endpoint that streams objects from Cloudflare R2
 * with immutable edge CDN caching headers.
 */
export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    const { key } = await params;
    const fullKey = Array.isArray(key) ? key.join("/") : key;

    if (!fullKey) {
      return NextResponse.json({ error: "Missing media key" }, { status: 400 });
    }

    const r2Result = await getFromR2(fullKey);

    if (!r2Result.success || !r2Result.buffer) {
      return NextResponse.json(
        { error: r2Result.error || "Media not found in Cloudflare R2" },
        { status: 404 },
      );
    }

    const bodyBytes = new Uint8Array(r2Result.buffer);

    return new NextResponse(bodyBytes, {
      status: 200,
      headers: {
        "Content-Type": r2Result.contentType || "image/jpeg",
        "Content-Length": bodyBytes.length.toString(),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error streaming from Cloudflare R2";
    console.error("[GET /api/media/r2] Error:", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
