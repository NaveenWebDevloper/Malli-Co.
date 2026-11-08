import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import mongoose from "mongoose";
import { auth } from "@/auth";
import { connectDB } from "../../../../lib/db.ts";
import { Variant } from "../../../../models/Variant.ts";
import { Product } from "../../../../models/Product.ts";
import { getOrCreateCart, enrichCart } from "../../../../lib/cart.ts";
import { getActiveCampaigns, resolvePrice } from "../../../../lib/pricing.ts";
import {
  AddToCartSchema,
  UpdateCartItemSchema,
  RemoveFromCartSchema,
} from "../../../../lib/validations/cart.ts";

export async function POST(req: NextRequest) {
  await connectDB();
  const cookieStore = await cookies();
  const existingToken = cookieStore.get("malli_cart_token")?.value || null;
  const session = await auth();
  const userId = session?.user?.id || null;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = AddToCartSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { variantId, quantity } = parsed.data;

  // Check variant exists and has stock
  const variant = await Variant.findById(variantId).lean();
  if (!variant || variant.status !== "ACTIVE") {
    return NextResponse.json({ error: "Variant not found or inactive" }, { status: 404 });
  }

  const cartDoc = await getOrCreateCart({ cartToken: existingToken, userId });

  const existingIdx = cartDoc.items.findIndex(
    (i) => i.variantId.toString() === variantId,
  );

  const currentQtyInCart = existingIdx > -1 ? cartDoc.items[existingIdx].quantity : 0;
  const totalDesiredQty = currentQtyInCart + quantity;

  if (variant.stock < totalDesiredQty) {
    return NextResponse.json(
      {
        error: `Only ${variant.stock} units available in stock. Cannot add ${quantity} more.`,
        available: variant.stock,
      },
      { status: 400 },
    );
  }

  const productDoc = await Product.findById(variant.productId).lean();
  const activeCampaigns = await getActiveCampaigns(new Date());
  const resolved = resolvePrice(variant, productDoc || {}, activeCampaigns);

  if (existingIdx > -1) {
    cartDoc.items[existingIdx].quantity += quantity;
    cartDoc.items[existingIdx].priceAtAdditionPaise = resolved.finalPrice;
    cartDoc.items[existingIdx].campaignIdAtAddition = resolved.appliedCampaignId;
    cartDoc.items[existingIdx].campaignNameAtAddition = resolved.appliedCampaignName;
  } else {
    cartDoc.items.push({
      variantId: new mongoose.Types.ObjectId(variantId),
      quantity,
      addedAt: new Date(),
      priceAtAdditionPaise: resolved.finalPrice,
      campaignIdAtAddition: resolved.appliedCampaignId,
      campaignNameAtAddition: resolved.appliedCampaignName,
    });
  }

  await cartDoc.save();
  const enriched = await enrichCart(cartDoc);

  const response = NextResponse.json({ success: true, cart: enriched });
  if (!existingToken || existingToken !== cartDoc.cartToken) {
    response.cookies.set("malli_cart_token", cartDoc.cartToken, {
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
      httpOnly: true,
      sameSite: "lax",
    });
  }

  return response;
}

export async function PATCH(req: NextRequest) {
  await connectDB();
  const cookieStore = await cookies();
  const existingToken = cookieStore.get("malli_cart_token")?.value || null;
  const session = await auth();
  const userId = session?.user?.id || null;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = UpdateCartItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { variantId, quantity } = parsed.data;

  const cartDoc = await getOrCreateCart({ cartToken: existingToken, userId });
  const existingIdx = cartDoc.items.findIndex(
    (i) => i.variantId.toString() === variantId,
  );

  if (existingIdx === -1) {
    return NextResponse.json({ error: "Item not in cart" }, { status: 404 });
  }

  if (quantity === 0) {
    cartDoc.items.splice(existingIdx, 1);
  } else {
    const variant = await Variant.findById(variantId).select("stock").lean();
    if (!variant) {
      return NextResponse.json({ error: "Variant not found" }, { status: 404 });
    }

    if (variant.stock < quantity) {
      return NextResponse.json(
        {
          error: `Only ${variant.stock} units available in stock.`,
          available: variant.stock,
        },
        { status: 400 },
      );
    }

    cartDoc.items[existingIdx].quantity = quantity;
  }

  await cartDoc.save();
  const enriched = await enrichCart(cartDoc);

  return NextResponse.json({ success: true, cart: enriched });
}

export async function DELETE(req: NextRequest) {
  await connectDB();
  const cookieStore = await cookies();
  const existingToken = cookieStore.get("malli_cart_token")?.value || null;
  const session = await auth();
  const userId = session?.user?.id || null;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = RemoveFromCartSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { variantId } = parsed.data;
  const cartDoc = await getOrCreateCart({ cartToken: existingToken, userId });

  cartDoc.items = cartDoc.items.filter(
    (i) => i.variantId.toString() !== variantId,
  );

  await cartDoc.save();
  const enriched = await enrichCart(cartDoc);

  return NextResponse.json({ success: true, cart: enriched });
}

