export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { connectDB } = await import("@/lib/db");
    try {
      await connectDB();
    } catch (err) {
      console.error("[MongoDB] Connection failure on server startup:", err);
    }
  }
}

