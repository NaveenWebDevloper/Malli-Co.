import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server.js";
import { cookies } from "next/headers.js";
import mongoose from "mongoose";
import { auth } from "../../../../auth.ts";
import { connectDB } from "../../../../lib/db.ts";
import { Order, type IOrderItem } from "../../../../models/Order.ts";
import { Variant } from "../../../../models/Variant.ts";
import { Customer } from "../../../../models/Customer.ts";
import { Cart } from "../../../../models/Cart.ts";
import { CheckoutPayloadSchema } from "../../../../lib/validations/cart.ts";
import {
  FREE_SHIPPING_THRESHOLD_PAISE,
  STANDARD_SHIPPING_PAISE,
} from "../../../../lib/cart.ts";
import { getActiveCampaigns, resolvePrice } from "../../../../lib/pricing.ts";

export async function POST(req: NextRequest) {
  await connectDB();
  const session = await auth();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = CheckoutPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const { items: requestedItems, shippingAddress, saveAddress, notes } = parsed.data;

  // Rule 1: Never trust client prices — compute totals server-side using lib/pricing.ts!
  const now = new Date();
  const activeCampaigns = await getActiveCampaigns(now);

  const variantIds = requestedItems.map((i) => i.variantId);
  const variants = await Variant.find({
    _id: { $in: variantIds },
    status: "ACTIVE",
  })
    .populate("productId", "name slug images status categoryId brandId gender basePricePaise")
    .lean();

  const variantMap = new Map<string, (typeof variants)[0]>();
  for (const v of variants) {
    variantMap.set(v._id.toString(), v);
  }

  const orderItems: IOrderItem[] = [];
  let subtotalPaise = 0;
  let discountPaise = 0;

  for (const item of requestedItems) {
    const v = variantMap.get(item.variantId);
    if (!v) {
      return NextResponse.json(
        { error: `Item with variant ID ${item.variantId} is not available.` },
        { status: 400 },
      );
    }

    // Check available stock: stock minus active reservations
    const available = v.stock - (v.reservedStock || 0);
    if (available < item.quantity) {
      return NextResponse.json(
        {
          error: `Insufficient stock for ${v.sku}. Requested: ${item.quantity}, Available: ${Math.max(0, available)}`,
          variantId: item.variantId,
          sku: v.sku,
          available: Math.max(0, available),
        },
        { status: 400 },
      );
    }

    const resolvedProductId =
      (v.productId as { _id?: mongoose.Types.ObjectId })?._id ||
      (mongoose.Types.ObjectId.isValid(v.productId as unknown as string)
        ? (v.productId as unknown as mongoose.Types.ObjectId)
        : null);

    if (!resolvedProductId) {
      return NextResponse.json(
        {
          error: `Item with SKU ${v.sku} does not have a valid parent product. Please contact support.`,
        },
        { status: 400 },
      );
    }

    const p = v.productId as unknown as {
      _id?: mongoose.Types.ObjectId;
      name?: string;
      slug?: string;
      images?: string[];
      categoryId?: unknown;
      brandId?: unknown;
      gender?: string;
      basePricePaise?: number;
    } | null;

    const displayImage =
      (v.images && v.images[0]) || (p?.images && p.images[0]) || "";

    // Server-side canonical dynamic pricing resolution (Rule 1 & Rule 2)
    const resolved = resolvePrice(v, p || {}, activeCampaigns, now);
    const basePricePaise = resolved.basePrice;
    const finalPricePaise = resolved.finalPrice;
    const compareAtPricePaise = resolved.compareAtPrice;
    const itemDiscountPaise = Math.max(0, basePricePaise - finalPricePaise);
    const campaignId = resolved.appliedCampaignId;
    const campaignName = resolved.appliedCampaignName;

    subtotalPaise += finalPricePaise * item.quantity;
    discountPaise += itemDiscountPaise * item.quantity;

    orderItems.push({
      variantId: v._id,
      productId: resolvedProductId,
      nameSnapshot: p?.name || "Apparel Item",
      skuSnapshot: v.sku,
      basePricePaise,
      compareAtPricePaise,
      finalPricePaise,
      discountAmountPaise: itemDiscountPaise,
      campaignId,
      campaignName,
      priceSnapshotPaise: finalPricePaise,
      qty: item.quantity,
      imageSnapshot: displayImage,
      optionsSnapshot:
        v.options instanceof Map
          ? v.options
          : new Map(Object.entries((v.options as Record<string, string>) || {})),
    });
  }

  const shippingPaise =
    subtotalPaise >= FREE_SHIPPING_THRESHOLD_PAISE
      ? 0
      : STANDARD_SHIPPING_PAISE;

  // 5% GST computed strictly on discounted selling price (subtotalPaise)
  const taxPaise = Math.round(subtotalPaise * 0.05);
  const totalPaise = subtotalPaise + shippingPaise + taxPaise;

  // Resolve or create Customer record
  let customerId: mongoose.Types.ObjectId;

  if (session?.user?.id && mongoose.Types.ObjectId.isValid(session.user.id)) {
    customerId = new mongoose.Types.ObjectId(session.user.id);

    // Save billing & shipping address to Customer account if requested
    if (saveAddress) {
      try {
        const customer = await Customer.findById(customerId);
        if (customer) {
          const addressMatches = customer.addresses.some(
            (a) =>
              a.street.toLowerCase().trim() === shippingAddress.street.toLowerCase().trim() &&
              a.postalCode.trim() === shippingAddress.postalCode.trim() &&
              a.city.toLowerCase().trim() === shippingAddress.city.toLowerCase().trim(),
          );

          if (!addressMatches) {
            customer.addresses.push({
              name: shippingAddress.name,
              phone: shippingAddress.phone,
              street: shippingAddress.street,
              landmark: shippingAddress.landmark || "",
              city: shippingAddress.city,
              state: shippingAddress.state,
              postalCode: shippingAddress.postalCode,
              country: shippingAddress.country || "IN",
              isDefault: customer.addresses.length === 0,
            });
            await customer.save();
          }
        }
      } catch (addrErr) {
        console.warn("Could not save address to customer profile:", addrErr);
      }
    }
  } else {
    const customerEmail = shippingAddress.email.toLowerCase().trim();
    try {
      const customer = await Customer.findOneAndUpdate(
        { email: customerEmail },
        {
          $setOnInsert: {
            name: shippingAddress.name,
            email: customerEmail,
            phone: shippingAddress.phone,
            role: "CUSTOMER",
            addresses: [
              {
                name: shippingAddress.name,
                phone: shippingAddress.phone,
                street: shippingAddress.street,
                landmark: shippingAddress.landmark,
                city: shippingAddress.city,
                state: shippingAddress.state,
                postalCode: shippingAddress.postalCode,
                country: shippingAddress.country || "IN",
                isDefault: true,
              },
            ],
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
      customerId = customer._id as mongoose.Types.ObjectId;
    } catch {
      // In case of high concurrency upsert race condition, fallback to findOne
      const existing = await Customer.findOne({ email: customerEmail });
      if (existing) {
        customerId = existing._id as mongoose.Types.ObjectId;
      } else {
        throw new Error("Failed to register customer profile");
      }
    }
  }

  // Generate unique order number: e.g. MC-XXXX-XXXX
  const orderNumber = `MC-${Date.now().toString(36).toUpperCase()}-${crypto
    .randomBytes(2)
    .toString("hex")
    .toUpperCase()}`;

  // Guest authorization token
  const rawGuestToken = crypto.randomBytes(24).toString("hex");
  const guestAccessTokenHash = crypto
    .createHash("sha256")
    .update(rawGuestToken)
    .digest("hex");

  // 15-minute reservation hold timestamp
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  // Mongoose transaction to atomically reserve stock and create order
  const sessionDB = await mongoose.startSession();
  let createdOrder: (typeof Order)["prototype"];

  try {
    await sessionDB.withTransaction(async () => {
      // 1. Atomically hold reservedStock for all items
      for (const item of requestedItems) {
        const updated = await Variant.findOneAndUpdate(
          {
            _id: item.variantId,
            $expr: {
              $gte: [
                { $subtract: ["$stock", { $ifNull: ["$reservedStock", 0] }] },
                item.quantity,
              ],
            },
          },
          {
            $inc: { reservedStock: item.quantity },
          },
          { session: sessionDB, new: true },
        );

        if (!updated) {
          throw new Error(
            `Could not reserve stock for variant ${item.variantId}. Another checkout may have claimed it.`,
          );
        }
      }

      // 2. Create Order in MongoDB with status PENDING
      const [order] = await Order.create(
        [
          {
            orderNumber,
            customerId,
            items: orderItems,
            status: "PENDING",
            paymentStatus: "PENDING",
            expiresAt,
            guestAccessTokenHash,
            totals: {
              subtotalPaise,
              shippingPaise,
              taxPaise,
              discountPaise,
              totalPaise,
            },
            shippingAddress: {
              name: shippingAddress.name,
              phone: shippingAddress.phone,
              street: shippingAddress.street,
              landmark: shippingAddress.landmark,
              city: shippingAddress.city,
              state: shippingAddress.state,
              postalCode: shippingAddress.postalCode,
              country: shippingAddress.country || "IN",
            },
            timeline: [
              {
                status: "PENDING",
                note: notes || "Order initiated via checkout (15-min stock hold)",
                performedBy: "Customer Checkout",
                timestamp: new Date(),
              },
            ],
          },
        ],
        { session: sessionDB },
      );

      createdOrder = order;
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Checkout reservation failed";
    return NextResponse.json({ error: errorMsg }, { status: 400 });
  } finally {
    await sessionDB.endSession();
  }

  // 3. Initiate real Razorpay Order via Razorpay API
  const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
  const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!razorpayKeyId || !razorpayKeySecret) {
    // Release hold if server configuration is invalid
    for (const item of requestedItems) {
      await Variant.updateOne(
        { _id: item.variantId },
        { $inc: { reservedStock: -item.quantity } },
      );
    }
    await Order.deleteOne({ _id: createdOrder._id });

    return NextResponse.json(
      { error: "Payment gateway credentials (RAZORPAY_KEY_ID/SECRET) are not configured." },
      { status: 500 },
    );
  }

  let razorpayOrderId: string;

  // Special case for mock/test keys or offline test environments
  if (
    razorpayKeyId.startsWith("rzp_test_mock") ||
    razorpayKeyId.includes("your_key_id") ||
    razorpayKeySecret.includes("your_razorpay_key_secret")
  ) {
    razorpayOrderId = `order_test_${crypto.randomBytes(8).toString("hex")}`;
  } else {
    try {
      const basicAuth = Buffer.from(
        `${razorpayKeyId}:${razorpayKeySecret}`,
      ).toString("base64");

      const rzpRes = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          Authorization: `Basic ${basicAuth}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: totalPaise, // strictly integer paise!
          currency: "INR",
          receipt: createdOrder.orderNumber,
          notes: {
            orderId: createdOrder._id.toString(),
            orderNumber: createdOrder.orderNumber,
          },
        }),
      });

      if (!rzpRes.ok) {
        const rzpErr = await rzpRes.json().catch(() => ({}));
        console.error("Razorpay order creation error:", rzpErr);

        // Auto-release hold on gateway failure
        for (const item of requestedItems) {
          await Variant.updateOne(
            { _id: item.variantId },
            { $inc: { reservedStock: -item.quantity } },
          );
        }
        await Order.deleteOne({ _id: createdOrder._id });

        return NextResponse.json(
          { error: "Razorpay payment order creation failed", details: rzpErr },
          { status: 502 },
        );
      }

      const rzpData = await rzpRes.json();
      razorpayOrderId = rzpData.id;
    } catch (networkErr) {
      console.error("Razorpay network error:", networkErr);
      // Auto-release hold on network failure
      for (const item of requestedItems) {
        await Variant.updateOne(
          { _id: item.variantId },
          { $inc: { reservedStock: -item.quantity } },
        );
      }
      await Order.deleteOne({ _id: createdOrder._id });

      return NextResponse.json(
        { error: "Failed to connect to payment gateway. Please try again." },
        { status: 502 },
      );
    }
  }

  // Update order with razorpayOrderId
  createdOrder.paymentDetails = {
    ...createdOrder.paymentDetails,
    razorpayOrderId,
  };
  await createdOrder.save();

  // Clear cart and set guest cookie
  try {
    const cookieStore = await cookies();
    const cartToken = cookieStore.get("malli_cart_token")?.value;
    if (cartToken) {
      await Cart.updateOne({ cartToken }, { $set: { items: [] } });
    }

    // Set guest order access cookie
    if (!session?.user?.id) {
      cookieStore.set(`malli_guest_order_${createdOrder.orderNumber}`, rawGuestToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60, // 7 days
        path: "/",
      });
    }
  } catch {
    // Graceful fallback when cookies() is not available in test or background environments
  }

  return NextResponse.json({
    success: true,
    orderId: createdOrder._id.toString(),
    orderNumber: createdOrder.orderNumber,
    razorpayOrderId,
    amountPaise: totalPaise,
    currency: "INR",
    keyId: razorpayKeyId,
    customer: {
      name: shippingAddress.name,
      email: shippingAddress.email,
      phone: shippingAddress.phone,
    },
  });
}
