import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { Campaign } from "@/models/Campaign";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/campaigns/[id]/duplicate
 * Clones an existing campaign into an inactive draft.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden: Admin role required" }, { status: 403 });
  }

  const { id } = await params;

  try {
    await connectDB();
    const source = await Campaign.findById(id).lean();

    if (!source) {
      return NextResponse.json({ error: "Source campaign not found" }, { status: 404 });
    }

    const uniqueSuffix = Date.now().toString(36).slice(-4);
    const newName = `Copy of ${source.name}`.slice(0, 80);
    const newSlug = `${source.slug}-copy-${uniqueSuffix}`.slice(0, 80);

    const cloneData = {
      ...source,
      _id: undefined,
      name: newName,
      slug: newSlug,
      active: false, // Cloned campaigns start paused/inactive for safety
      createdAt: undefined,
      updatedAt: undefined,
    };

    const created = await Campaign.create(cloneData);

    try {
      revalidateTag("campaigns");
    } catch {
      // safe fallback
    }

    return NextResponse.json(
      {
        success: true,
        campaign: {
          id: created._id.toString(),
          ...created.toObject(),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Duplicate campaign error:", error);
    return NextResponse.json({ error: "Failed to duplicate campaign" }, { status: 500 });
  }
}
