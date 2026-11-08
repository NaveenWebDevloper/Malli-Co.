import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Product } from "@/models/Product";
import { isR2Configured, getR2Config } from "@/lib/r2";

export const dynamic = "force-dynamic";

export async function GET() {
  const timestamp = new Date().toISOString();
  const r2Config = getR2Config();

  const storageCheck = {
    r2Configured: isR2Configured(),
    r2Bucket: r2Config?.bucketName || null,
    r2PublicUrl: r2Config?.publicUrl || null,
    cloudinaryConfigured: Boolean(
      process.env.CLOUDINARY_CLOUD_NAME ||
      process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
    ),
  };

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
      storage: storageCheck,
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
        storage: storageCheck,
        database: {
          connected: false,
          error: errorMsg,
          diagnostic:
            "If error is connection timed out or network error, please check MongoDB Atlas -> Network Access and add 0.0.0.0/0 (Allow access from anywhere).",
        },
      },
      { status: 503 },
    );
  }
}
