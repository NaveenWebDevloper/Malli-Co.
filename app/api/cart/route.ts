import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { getOrCreateCart, enrichCart } from "../../../lib/cart.ts";

export async function GET() {
  const cookieStore = await cookies();
  const existingToken = cookieStore.get("malli_cart_token")?.value || null;
  const session = await auth();
  const userId = session?.user?.id || null;

  const cartDoc = await getOrCreateCart({
    cartToken: existingToken,
    userId,
  });

  const enriched = await enrichCart(cartDoc);

  const response = NextResponse.json({ cart: enriched });

  // If token was newly issued, persist cookie for 30 days
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
