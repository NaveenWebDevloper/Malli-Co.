import type { Metadata } from "next";
import Script from "next/script";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { Customer } from "@/models/Customer";
import { CheckoutView } from "@/components/store/CheckoutView";

export const metadata: Metadata = {
  title: "Secure Checkout | Malli & Co. Luxury Apparel",
  description:
    "Complete your artisanal garment order with secure Razorpay payment processing and pan-India delivery.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function CheckoutPage() {
  const session = await auth();

  // Authentication Required: Client must have an account to complete checkout
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/checkout");
  }

  await connectDB();
  const customer = await Customer.findById(session.user.id).lean();

  const customerData = {
    id: customer ? customer._id.toString() : session.user.id,
    name: customer?.name || session.user.name || "",
    email: customer?.email || session.user.email || "",
    phone: customer?.phone || "",
    addresses: (customer?.addresses || []).map((a) => ({
      name: a.name,
      phone: a.phone,
      street: a.street,
      landmark: a.landmark || "",
      city: a.city,
      state: a.state,
      postalCode: a.postalCode,
      country: a.country || "IN",
      isDefault: !!a.isDefault,
    })),
  };

  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="lazyOnload"
      />
      <CheckoutView initialCustomer={customerData} />
    </>
  );
}
