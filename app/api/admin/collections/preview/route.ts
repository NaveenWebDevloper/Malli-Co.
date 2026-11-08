import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { resolveCollectionProducts } from "@/lib/collections";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/collections/preview
 * Returns live resolved products for a draft collection payload.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden: Admin role required" }, { status: 403 });
  }

  try {
    const body = await req.json();
    await connectDB();

    const mockCollection = {
      name: body.name || "Preview",
      slug: body.slug || "preview",
      title: body.title || "Preview Title",
      subtitle: body.subtitle,
      mode: body.mode || "MANUAL",
      productIds: body.productIds || [],
      autoRule: body.autoRule || { type: "BESTSELLERS", limit: body.maxItems || 10 },
      maxItems: body.maxItems || 10,
      active: true,
    };

    const resolved = await resolveCollectionProducts(mockCollection, {
      previewMax: body.maxItems || 10,
    });

    return NextResponse.json({
      success: true,
      products: resolved.products,
      totalResolved: resolved.totalResolved,
    });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : "Failed to generate preview";
    console.error("Failed to generate preview:", error);
    return NextResponse.json({ error: errMessage }, { status: 500 });
  }
}
