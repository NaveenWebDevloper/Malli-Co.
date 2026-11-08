import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Product } from "@/models/Product";

export const dynamic = "force-dynamic";

export async function GET() {
  const timestamp = new Date().toISOString();
  const envCheck = {
    hasMongoUri: Boolean(process.env.MONGODB_URI),
    hasMongoDirectUri: Boolean(process.env.MONGODB_DIRECT_URI),
    hasAuthSecret: Boolean(process.env.AUTH_SECRET),
  };

  try {
    const conn = await connectDB();
    const productCount = await Product.countDocuments();

    return NextResponse.json({
      status: "healthy",
      service: "malli-and-co-api",
      timestamp,
      environment: envCheck,
      database: {
        connected: true,
        name: conn.connection.name,
        host: conn.connection.host,
        productCount,
      },
    });
  } catch (dbErr) {
    const errorMsg = dbErr instanceof Error ? dbErr.message : "Unknown database error";
    return NextResponse.json(
      {
        status: "unhealthy",
        service: "malli-and-co-api",
        timestamp,
        environment: envCheck,
        database: {
          connected: false,
          error: errorMsg,
          diagnostic:
            "If error is connection timed out or network error, please check MongoDB Atlas -> Network Access and add 0.0.0.0/0 (Allow access from anywhere). Also ensure MONGODB_URI and MONGODB_DIRECT_URI are added in Vercel Environment Variables.",
        },
      },
      { status: 503 },
    );
  }
}
