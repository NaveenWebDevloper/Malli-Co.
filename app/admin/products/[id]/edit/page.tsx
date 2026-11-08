import { notFound } from "next/navigation";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { Product } from "@/models/Product";
import { Variant } from "@/models/Variant";
import { Brand } from "@/models/Brand";
import { Category } from "@/models/Category";
import { paiseToRupees } from "@/lib/currency";
import ProductForm from "@/components/admin/ProductForm";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    notFound();
  }

  await connectDB();

  const [product, variants, brands, categories] = await Promise.all([
    Product.findById(id).lean(),
    Variant.find({ productId: id, status: "ACTIVE" }).lean(),
    Brand.find({ isActive: true }).select("_id name").sort({ name: 1 }).lean(),
    Category.find({ isActive: true })
      .select("_id name gender")
      .sort({ name: 1 })
      .lean(),
  ]);

  if (!product) {
    notFound();
  }

  const formattedBrands = brands.map((b) => ({
    _id: b._id.toString(),
    name: b.name,
  }));

  const formattedCategories = categories.map((c) => ({
    _id: c._id.toString(),
    name: c.name,
    gender: c.gender,
  }));

  const formattedVariants = variants.map((v) => ({
    _id: v._id.toString(),
    sku: v.sku,
    price: paiseToRupees(v.pricePaise),
    compareAtPrice: v.compareAtPricePaise
      ? paiseToRupees(v.compareAtPricePaise)
      : null,
    stock: v.stock,
    images: v.images || [],
    options: Object.fromEntries(
      v.options instanceof Map ? v.options : Object.entries(v.options || {}),
    ),
    isDefault: Boolean(v.isDefault),
    status: v.status as "ACTIVE" | "ARCHIVED",
  }));

  const initialData = {
    _id: product._id.toString(),
    name: product.name,
    slug: product.slug,
    description: product.description,
    brandId: product.brandId.toString(),
    categoryId: product.categoryId.toString(),
    gender: product.gender,
    type: product.type,
    basePrice: paiseToRupees(product.basePricePaise),
    status: product.status,
    images: product.images || [],
    productAttributes: product.productAttributes || [],
    variants: formattedVariants,

  };

  return (
    <div className="mx-auto max-w-6xl">
      <ProductForm
        initialData={initialData}
        brands={formattedBrands}
        categories={formattedCategories}
      />
    </div>
  );
}
