import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { Customer } from "@/models/Customer";

// Rule 6: Strict Zod validation
const RegisterSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  email: z.string().trim().toLowerCase().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phone: z.string().trim().optional(),
});

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    const parsed = RegisterSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const { name, email, password, phone } = parsed.data;

    // Check if customer already exists
    const existing = await Customer.findOne({ email }).select("+passwordHash");

    if (existing && existing.passwordHash) {
      return NextResponse.json(
        { error: "An account with this email already exists. Please sign in." },
        { status: 409 },
      );
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    if (existing) {
      // Existing customer from guest checkout: attach credentials
      existing.name = name;
      existing.passwordHash = passwordHash;
      if (phone) existing.phone = phone;
      await existing.save();

      return NextResponse.json(
        {
          success: true,
          message: "Account activated successfully. You can now sign in.",
          userId: existing._id.toString(),
        },
        { status: 200 },
      );
    }

    // New customer registration
    const newCustomer = await Customer.create({
      name,
      email,
      phone: phone || "",
      passwordHash,
      role: "CUSTOMER",
      addresses: [],
    });

    return NextResponse.json(
      {
        success: true,
        message: "Account created successfully.",
        userId: newCustomer._id.toString(),
      },
      { status: 201 },
    );
  } catch (err: unknown) {
    console.error("Customer registration error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred during registration. Please try again." },
      { status: 500 },
    );
  }
}

