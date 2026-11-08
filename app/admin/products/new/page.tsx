import { connectDB } from "@/lib/db";
import { Brand } from "@/models/Brand";
import { Category } from "@/models/Category";
import ProductForm from "@/components/admin/ProductForm";

export default async function NewProductPage() {
  await connectDB();

  const [brands, categories] = await Promise.all([
    Brand.find({ isActive: true }).select("_id name").sort({ name: 1 }).lean(),
    Category.find({ isActive: true })
      .select("_id name gender")
      .sort({ name: 1 })
      .lean(),
  ]);

  const formattedBrands = brands.map((b) => ({
    _id: b._id.toString(),
    name: b.name,
  }));

  const formattedCategories = categories.map((c) => ({
    _id: c._id.toString(),
    name: c.name,
    gender: c.gender,
  }));

  return (
    <div className="mx-auto max-w-6xl">
      <ProductForm brands={formattedBrands} categories={formattedCategories} />
    </div>
  );
}
