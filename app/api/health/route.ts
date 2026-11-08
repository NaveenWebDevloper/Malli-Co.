import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "malli-and-co-api",
    timestamp: new Date().toISOString(),
  });
}
