import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { Customer } from "@/models/Customer";
import { z } from "zod";

const AddressInputSchema = z.object({
  name: z.string().min(2, "Full name is required").trim(),
  phone: z
    .string()
    .min(10, "Valid 10-digit phone number is required")
    .max(15)
    .trim(),
  street: z.string().min(5, "Street address is required").trim(),
  landmark: z.string().optional().default(""),
  city: z.string().min(2, "City is required").trim(),
  state: z.string().min(2, "State is required").trim(),
  postalCode: z
    .string()
    .regex(/^\d{6}$/, "Valid 6-digit Indian PIN code is required")
    .trim(),
  country: z.string().default("IN"),
  isDefault: z.boolean().optional().default(false),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const customer = await Customer.findById(session.user.id).lean();
  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  return NextResponse.json({ addresses: customer.addresses || [] });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Authentication required to save addresses." },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = AddressInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  await connectDB();
  const customer = await Customer.findById(session.user.id);
  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  const newAddress = parsed.data;

  // If marked as default, unset other defaults
  if (newAddress.isDefault) {
    for (const a of customer.addresses) {
      a.isDefault = false;
    }
  }

  // Prevent duplicate address insertion
  const existingIndex = customer.addresses.findIndex(
    (a) =>
      a.street.toLowerCase().trim() === newAddress.street.toLowerCase().trim() &&
      a.postalCode.trim() === newAddress.postalCode.trim() &&
      a.city.toLowerCase().trim() === newAddress.city.toLowerCase().trim(),
  );

  if (existingIndex >= 0) {
    // Update existing address
    customer.addresses[existingIndex].name = newAddress.name;
    customer.addresses[existingIndex].phone = newAddress.phone;
    customer.addresses[existingIndex].landmark = newAddress.landmark;
    customer.addresses[existingIndex].state = newAddress.state;
    if (newAddress.isDefault) {
      customer.addresses[existingIndex].isDefault = true;
    }
  } else {
    // Append new address
    customer.addresses.push({
      ...newAddress,
      isDefault: customer.addresses.length === 0 || newAddress.isDefault,
    });
  }

  await customer.save();

  return NextResponse.json({
    success: true,
    addresses: customer.addresses,
  });
}

