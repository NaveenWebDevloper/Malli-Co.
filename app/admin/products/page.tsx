import { connectDB } from "@/lib/db";
import { Product } from "@/models/Product";
import { Variant } from "@/models/Variant";
import { Brand } from "@/models/Brand";
import { Category } from "@/models/Category";
import { ProductsManager, type AdminProductItem } from "@/components/admin/ProductsManager";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  await connectDB();

  const limit = 10;

  const [activeProducts, brands, categories, activeCount, draftCount, trashCount] =
    await Promise.all([
      Product.find({ deletedAt: null, status: "ACTIVE" })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate("brandId", "name slug")
        .populate("categoryId", "name slug gender")
        .lean(),
      Brand.find({ isActive: true }).select("name slug").lean(),
      Category.find({ isActive: true }).select("name slug gender").lean(),
      Product.countDocuments({ deletedAt: null, status: "ACTIVE" }),
      Product.countDocuments({ deletedAt: null, status: "DRAFT" }),
      Product.countDocuments({ deletedAt: { $ne: null } }),
    ]);

  const productIds = activeProducts.map((p) => p._id);
  const variants = await Variant.find({
    productId: { $in: productIds },
    status: "ACTIVE",
    deletedAt: null,
  })
    .select("productId stock sku")
    .lean();

  const variantsByProduct = new Map<string, typeof variants>();
  for (const v of variants) {
    const pId = v.productId.toString();
    const list = variantsByProduct.get(pId) || [];
    list.push(v);
    variantsByProduct.set(pId, list);
  }

  const initialProducts: AdminProductItem[] = activeProducts.map((p) => {
    const pVariants = variantsByProduct.get(p._id.toString()) || [];
    const totalStock = pVariants.reduce((sum, v) => sum + (v.stock || 0), 0);

    const brand = p.brandId as unknown as { _id?: unknown; name?: string; slug?: string } | null;
    const category = p.categoryId as unknown as { _id?: unknown; name?: string; slug?: string; gender?: string } | null;

    return {
      _id: p._id.toString(),
      name: p.name,
      slug: p.slug,
      description: p.description,
      gender: p.gender as "MEN" | "KIDS",
      type: p.type as "SIMPLE" | "VARIABLE",
      basePricePaise: p.basePricePaise,
      status: p.status as "ACTIVE" | "DRAFT",
      deletedAt: p.deletedAt ? p.deletedAt.toISOString() : null,
      deleteReason: p.deleteReason || null,
      images: p.images || [],
      brandId: brand ? { _id: String(brand._id), name: brand.name || "", slug: brand.slug || "" } : null,
      categoryId: category ? { _id: String(category._id), name: category.name || "", slug: category.slug || "", gender: category.gender } : null,
      totalStock,
      skuCount: pVariants.length,
      sampleSku: pVariants[0]?.sku || "",
    };
  });

  return (
    <ProductsManager
      initialProducts={initialProducts}
      initialCounts={{
        active: activeCount,
        draft: draftCount,
        trash: trashCount,
      }}
      brands={brands.map((b) => ({ _id: b._id.toString(), name: b.name, slug: b.slug }))}
      categories={categories.map((c) => ({
        _id: c._id.toString(),
        name: c.name,
        slug: c.slug,
        gender: c.gender,
      }))}
      initialPagination={{
        page: 1,
        limit,
        totalCount: activeCount,
        totalPages: Math.ceil(activeCount / limit) || 1,
      }}
    />
  );
}
