import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { Customer } from "../models/Customer.ts";

function loadEnv() {
  if (process.env.MONGODB_URI && process.env.ADMIN_PASSWORD) return;

  const envFiles = [".env.local", ".env"];
  for (const file of envFiles) {
    const fullPath = path.resolve(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, "utf-8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const [key, ...rest] = trimmed.split("=");
        if (key && rest.length > 0) {
          const val = rest.join("=").replace(/^["'](.*)["']$/, "$1");
          if (!process.env[key.trim()]) {
            process.env[key.trim()] = val.trim();
          }
        }
      }
      break;
    }
  }
}

export async function runAdminSeed() {
  loadEnv();

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      "MONGODB_URI is required. Please set it in .env.local or environment.",
    );
  }

  const adminEmail = (process.env.ADMIN_EMAIL || "admin@malliandco.com")
    .trim()
    .toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || "MalliAdminSecure2026!";
  const adminName = process.env.ADMIN_NAME || "Malli Admin";

  console.log(`Connecting to MongoDB Atlas...`);
  await mongoose.connect(uri);
  console.log(`Connected.`);

  console.log(`Seeding Admin user: ${adminEmail} (Role: ADMIN)...`);
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  const admin = await Customer.findOneAndUpdate(
    { email: adminEmail },
    {
      name: adminName,
      email: adminEmail,
      passwordHash,
      role: "ADMIN",
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  console.log(`Admin user successfully seeded!`);
  console.log(`ID:    ${admin._id}`);
  console.log(`Email: ${admin.email}`);
  console.log(`Role:  ${admin.role}`);

  await mongoose.disconnect();
}

if (process.argv[1] && process.argv[1].endsWith("seed-admin.ts")) {
  runAdminSeed().catch((err) => {
    console.error("Admin seed failed:", err);
    process.exit(1);
  });
}
