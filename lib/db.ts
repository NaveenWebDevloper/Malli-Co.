import mongoose from "mongoose";

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongooseCache: MongooseCache | undefined;
}

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DIRECT_URI = process.env.MONGODB_DIRECT_URI;

const cached: MongooseCache = global.mongooseCache ?? {
  conn: null,
  promise: null,
};

if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

/**
 * Returns a cached Mongoose connection or initializes a new one.
 * Cached on globalThis to prevent connection leaks across hot-reloads in development
 * and warm executions in serverless runtimes (Rule 5).
 */
export async function connectDB(): Promise<typeof mongoose> {
  const directUri = process.env.MONGODB_DIRECT_URI || MONGODB_DIRECT_URI;
  const srvUri = process.env.MONGODB_URI || MONGODB_URI;
  const uri = srvUri || directUri;

  if (!uri) {
    throw new Error(
      "Please define the MONGODB_URI or MONGODB_DIRECT_URI environment variable inside .env.local",
    );
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts: mongoose.ConnectOptions = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 8000,
    };

    cached.promise = mongoose
      .connect(uri, opts)
      .catch(async (err: unknown) => {
        // Fallback: If primary connection fails (DNS querySrv, network timeout, etc.)
        // and direct replica-set URI exists, seamlessly retry with direct connection.
        if (directUri && uri !== directUri) {
          console.warn(
            "[MongoDB] Primary connection failed. Seamlessly connecting via direct replica-set...",
          );
          return mongoose.connect(directUri, opts);
        }
        throw err;
      })
      .then((instance) => {
        console.log(
          `✓ [MongoDB] Connected successfully to Atlas cluster! Database: "${instance.connection.name}" | Host: ${instance.connection.host}`,
        );
        return instance;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null;
    throw error;
  }

  return cached.conn;
}

export default connectDB;
