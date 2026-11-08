import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import {
  Brand,
  Category,
  Attribute,
  AttributeValue,
  Product,
  Variant,
  InventoryMovement,
  Customer,
} from "../models/index.ts";

// Load environment variables from .env.local or .env if not present
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

/**
 * Seeds the initial Admin user from environment variables.
 */
export async function seedAdmin() {
  const adminEmail = (process.env.ADMIN_EMAIL || "admin@malliandco.com")
    .trim()
    .toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || "MalliAdminSecure2026!";
  const adminName = process.env.ADMIN_NAME || "Malli Admin";

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

  console.log(`Admin user seeded successfully with ID: ${admin._id}`);
  return admin;
}

export async function seedDatabase() {
  loadEnv();

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      "MONGODB_URI is not set. Please set MONGODB_URI in .env.local or environment.",
    );
  }

  console.log("Connecting to MongoDB Atlas...");
  await mongoose.connect(uri);
  console.log("Connected successfully.");

  // 1. Seed Admin User
  await seedAdmin();

  console.log("Clearing existing catalog collections...");
  await Promise.all([
    Brand.deleteMany({}),
    Category.deleteMany({}),
    Attribute.deleteMany({}),
    AttributeValue.deleteMany({}),
    Product.deleteMany({}),
    Variant.deleteMany({}),
    InventoryMovement.deleteMany({}),
  ]);
  console.log("Catalog collections cleared.");

  // 2. Seed Brands
  console.log("Seeding Brands...");
  const [brandHeritage, brandLittle] = await Brand.create([
    {
      name: "Malli Heritage",
      slug: "malli-heritage",
      description:
        "Artisanal luxury menswear tailored from fine cottons and linens.",
      logoUrl: "/images/brands/malli-heritage-logo.svg",
      isActive: true,
    },
    {
      name: "Little Malli",
      slug: "little-malli",
      description:
        "Comfort-first, organic cotton and festive clothing for children.",
      logoUrl: "/images/brands/little-malli-logo.svg",
      isActive: true,
    },
  ]);
  console.log(`Created 2 brands: ${brandHeritage.name}, ${brandLittle.name}`);

  // 3. Seed Categories (Men & Kids)
  console.log("Seeding Categories...");
  const parentMen = await Category.create({
    name: "Men",
    slug: "men",
    description: "Premium apparel for gentlemen.",
    gender: "MEN",
    isActive: true,
  });

  const parentKids = await Category.create({
    name: "Kids",
    slug: "kids",
    description: "Curated collections for boys and girls.",
    gender: "KIDS",
    isActive: true,
  });

  const [categoryMenShirts, categoryMenTShirts, categoryKidsFestive] =
    await Category.create([
      {
        name: "Men's Shirts",
        slug: "mens-shirts",
        description: "Tailored Oxford, Linen, and Formal Shirts.",
        gender: "MEN",
        parentId: parentMen._id,
        isActive: true,
      },
      {
        name: "Men's T-Shirts",
        slug: "mens-t-shirts",
        description:
          "Everyday luxury Pima and Supima cotton crewnecks and polos.",
        gender: "MEN",
        parentId: parentMen._id,
        isActive: true,
      },
      {
        name: "Kids' Festive Wear",
        slug: "kids-festive-wear",
        description:
          "Traditional and modern celebratory outfits for young ones.",
        gender: "KIDS",
        parentId: parentKids._id,
        isActive: true,
      },
    ]);
  console.log(
    `Created categories: ${parentMen.name}, ${parentKids.name}, ${categoryMenShirts.name}, ${categoryMenTShirts.name}, ${categoryKidsFestive.name}`,
  );

  // 4. Seed Attributes & Attribute Values
  console.log("Seeding Attributes & Values...");
  const attrSize = await Attribute.create({
    name: "Size",
    code: "size",
  });

  const attrColor = await Attribute.create({
    name: "Color",
    code: "color",
  });

  const sizeValues = ["S", "M", "L", "XL"];
  const sizeValueDocs = await AttributeValue.create(
    sizeValues.map((sz) => ({
      attributeId: attrSize._id,
      value: sz,
      code: sz.toLowerCase(),
    })),
  );

  const colorData = [
    { name: "Navy Blue", code: "navy-blue", hex: "#1B2A4A", abbr: "NVY" },
    { name: "Olive Green", code: "olive-green", hex: "#556B2F", abbr: "OLV" },
    { name: "Burgundy", code: "burgundy", hex: "#800020", abbr: "BUR" },
  ];

  const colorValueDocs = await AttributeValue.create(
    colorData.map((c) => ({
      attributeId: attrColor._id,
      value: c.name,
      code: c.code,
      hexColor: c.hex,
    })),
  );
  console.log(
    `Created attributes: Size (${sizeValueDocs.length} values), Color (${colorValueDocs.length} values)`,
  );

  // 5. Seed 1 Simple Product (Malli Heritage Linen Oxford Shirt)
  console.log("Seeding Simple Product...");
  const simpleProduct = await Product.create({
    name: "Classic Pure Linen Oxford Shirt",
    slug: "classic-pure-linen-oxford-shirt",
    description:
      "Woven from 100% French flax linen. Breathable, relaxed tailoring with mother-of-pearl buttons.",
    brandId: brandHeritage._id,
    categoryId: categoryMenShirts._id,
    gender: "MEN",
    type: "SIMPLE",
    basePricePaise: 249900, // ₹2,499.00 in integer paise (Rule 2)
    status: "ACTIVE",
    images: [
      "/images/products/linen-oxford-front.jpg",
      "/images/products/linen-oxford-back.jpg",
    ],
    productAttributes: [],
  });

  // Default Variant for Simple Product (Requirement: SIMPLE gets one default variant)
  const simpleVariant = await Variant.create({
    productId: simpleProduct._id,
    sku: "MH-LIN-OXF-WHT",
    pricePaise: 249900,
    compareAtPricePaise: 299900,
    stock: 50,
    images: ["/images/products/linen-oxford-front.jpg"],
    options: new Map([["Style", "Standard"]]),
    isDefault: true,
    status: "ACTIVE",
  });

  // Log Initial Stock Movement (Rule 3)
  await InventoryMovement.create({
    variantId: simpleVariant._id,
    productId: simpleProduct._id,
    sku: simpleVariant.sku,
    change: 50,
    previousStock: 0,
    newStock: 50,
    reason: "RESTOCK",
    note: "Initial seed stock allocation",
  });
  console.log(
    `Created Simple Product: ${simpleProduct.name} with Variant SKU: ${simpleVariant.sku}`,
  );

  // 6. Seed 1 Variable Product (Signature Pima Cotton Crewneck T-Shirt)
  console.log(
    "Seeding Variable T-Shirt with sizes S-XL and 3 colors (12 variants)...",
  );
  const variableProduct = await Product.create({
    name: "Signature Pima Cotton Crewneck T-Shirt",
    slug: "signature-pima-cotton-crewneck-t-shirt",
    description:
      "Ultra-soft Peruvian Pima cotton with double-needle stitched seams and pre-shrunk finish.",
    brandId: brandHeritage._id,
    categoryId: categoryMenTShirts._id,
    gender: "MEN",
    type: "VARIABLE",
    basePricePaise: 129900, // ₹1,299.00 in integer paise (Rule 2)
    status: "ACTIVE",
    images: [
      "/images/products/pima-tee-navy.jpg",
      "/images/products/pima-tee-olive.jpg",
      "/images/products/pima-tee-burgundy.jpg",
    ],
    productAttributes: [
      {
        attributeId: attrSize._id,
        name: "Size",
        values: sizeValues,
      },
      {
        attributeId: attrColor._id,
        name: "Color",
        values: colorData.map((c) => c.name),
      },
    ],
  });

  // Generate 12 Variants: 4 sizes × 3 colors
  const variantsToInsert: Array<{
    productId: mongoose.Types.ObjectId;
    sku: string;
    pricePaise: number;
    compareAtPricePaise?: number;
    stock: number;
    images: string[];
    options: Map<string, string>;
    isDefault: boolean;
    status: "ACTIVE";
  }> = [];

  const stockAllocation: Record<string, number> = {
    S: 20,
    M: 35,
    L: 30,
    XL: 15,
  };

  let isFirst = true;
  for (const color of colorData) {
    for (const size of sizeValues) {
      const sku = `MH-TEE-${color.abbr}-${size}`;
      const stock = stockAllocation[size] || 20;

      variantsToInsert.push({
        productId: variableProduct._id as mongoose.Types.ObjectId,
        sku,
        pricePaise: 129900, // ₹1,299.00
        compareAtPricePaise: 159900, // ₹1,599.00
        stock,
        images: [`/images/products/pima-tee-${color.code}.jpg`],
        options: new Map([
          ["Size", size],
          ["Color", color.name],
        ]),
        isDefault: isFirst, // First variant is default
        status: "ACTIVE",
      });
      isFirst = false;
    }
  }

  const createdVariants = await Variant.create(variantsToInsert);

  // Log inventory movements for all created variants (Rule 3)
  const movements = createdVariants.map((v) => ({
    variantId: v._id,
    productId: variableProduct._id,
    sku: v.sku,
    change: v.stock,
    previousStock: 0,
    newStock: v.stock,
    reason: "RESTOCK" as const,
    note: "Initial seed stock allocation",
  }));
  await InventoryMovement.create(movements);

  console.log(
    `Created Variable Product: ${variableProduct.name} with ${createdVariants.length} variants across S-XL and 3 colors.`,
  );

  console.log("Database seed script completed successfully.");
}

// Allow direct CLI execution if executed directly
if (process.argv[1] && process.argv[1].endsWith("seed.ts")) {
  seedDatabase()
    .then(async () => {
      await mongoose.disconnect();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error("Seeding failed with error:", err);
      await mongoose.disconnect();
      process.exit(1);
    });
}
