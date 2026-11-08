import Link from "next/link";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { Product, IProduct } from "@/models/Product";
import { Variant } from "@/models/Variant";
import { Brand } from "@/models/Brand";
import { Category } from "@/models/Category";
import { formatCurrency } from "@/lib/currency";

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    categoryId?: string;
    brandId?: string;
    status?: string;
    gender?: string;
    type?: string;
    page?: string;
  }>;
}) {
  await connectDB();
  const params = await searchParams;

  const search = params.search?.trim() || "";
  const categoryId = params.categoryId?.trim();
  const brandId = params.brandId?.trim();
  const status = params.status?.trim();
  const gender = params.gender?.trim();
  const type = params.type?.trim();
  const page = Math.max(1, parseInt(params.page || "1", 10));
  const limit = 10;
  const skip = (page - 1) * limit;

  const query: mongoose.FilterQuery<IProduct> = {};

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { slug: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
    ];
  }

  if (categoryId && mongoose.Types.ObjectId.isValid(categoryId)) {
    query.categoryId = new mongoose.Types.ObjectId(categoryId);
  }

  if (brandId && mongoose.Types.ObjectId.isValid(brandId)) {
    query.brandId = new mongoose.Types.ObjectId(brandId);
  }

  if (status && (status === "ACTIVE" || status === "DRAFT")) {
    query.status = status;
  }

  if (gender && (gender === "MEN" || gender === "KIDS")) {
    query.gender = gender;
  }

  if (type && (type === "SIMPLE" || type === "VARIABLE")) {
    query.type = type;
  }

  const [products, totalCount, brands, categories] = await Promise.all([
    Product.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("brandId", "name slug")
      .populate("categoryId", "name slug")
      .lean(),
    Product.countDocuments(query),
    Brand.find({ isActive: true }).select("name slug").lean(),
    Category.find({ isActive: true }).select("name slug gender").lean(),
  ]);

  const productIds = products.map((p) => p._id);
  const variants = await Variant.find({
    productId: { $in: productIds },
    status: "ACTIVE",
  })
    .select("productId stock sku pricePaise compareAtPricePaise isDefault")
    .lean();

  const variantsByProduct = new Map<string, typeof variants>();
  for (const v of variants) {
    const pId = v.productId.toString();
    const list = variantsByProduct.get(pId) || [];
    list.push(v);
    variantsByProduct.set(pId, list);
  }

  const totalPages = Math.ceil(totalCount / limit);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            Products & Inventory
          </h1>
          <p className="text-xs text-neutral-500">
            {totalCount} total products found across Men&apos;s and Kids&apos;
            catalog
          </p>
        </div>

        <Link
          href="/admin/products/new"
          className="inline-flex items-center gap-1.5 rounded-lg bg-black px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
        >
          <span>➕ Add Product</span>
        </Link>
      </div>

      {/* Filter Toolbar Form */}
      <form
        method="GET"
        className="grid grid-cols-1 gap-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm sm:grid-cols-6 dark:border-neutral-800 dark:bg-neutral-900"
      >
        <div className="sm:col-span-2">
          <input
            type="text"
            name="search"
            defaultValue={search}
            placeholder="Search by product name, slug..."
            className="w-full rounded-lg border border-neutral-300 px-3 py-1.5 text-xs text-neutral-900 shadow-sm focus:border-black focus:ring-1 focus:ring-black dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
          />
        </div>

        <div>
          <select
            name="brandId"
            defaultValue={brandId || ""}
            className="w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-xs text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
          >
            <option value="">All Brands</option>
            {brands.map((b) => (
              <option key={b._id.toString()} value={b._id.toString()}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            name="categoryId"
            defaultValue={categoryId || ""}
            className="w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-xs text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c._id.toString()} value={c._id.toString()}>
                {c.name} ({c.gender})
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            name="status"
            defaultValue={status || ""}
            className="w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-xs text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="DRAFT">Draft</option>
          </select>
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            className="flex-1 rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-black dark:bg-neutral-700 dark:hover:bg-neutral-600"
          >
            Filter
          </button>
          <Link
            href="/admin/products"
            className="rounded-lg border border-neutral-300 px-2.5 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
            title="Reset Filters"
          >
            ↺
          </Link>
        </div>
      </form>

      {/* Products Table */}
      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-neutral-500 uppercase tracking-wider dark:border-neutral-800 dark:bg-neutral-800 dark:text-neutral-400">
              <tr>
                <th className="py-3 px-4 font-semibold">Product</th>
                <th className="py-3 px-4 font-semibold">Classification</th>
                <th className="py-3 px-4 font-semibold">Type</th>
                <th className="py-3 px-4 font-semibold">Base Price</th>
                <th className="py-3 px-4 font-semibold">Stock Status</th>
                <th className="py-3 px-4 font-semibold">Catalog Status</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {products.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-12 text-center text-sm text-neutral-500"
                  >
                    No products matched your search filters.
                  </td>
                </tr>
              ) : (
                products.map((p) => {
                  const pVariants =
                    variantsByProduct.get(p._id.toString()) || [];
                  const totalStock = pVariants.reduce(
                    (sum, v) => sum + (v.stock || 0),
                    0,
                  );
                  const brandObj = p.brandId as { name?: string } | null;
                  const categoryObj = p.categoryId as { name?: string } | null;
                  const brandName = brandObj?.name || "—";
                  const categoryName = categoryObj?.name || "—";

                  let stockBadgeClass =
                    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400";
                  let stockText = `In Stock (${totalStock})`;

                  if (totalStock === 0) {
                    stockBadgeClass =
                      "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400";
                    stockText = "Out of Stock (0)";
                  } else if (totalStock <= 5) {
                    stockBadgeClass =
                      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400";
                    stockText = `Low Stock (${totalStock})`;
                  }

                  return (
                    <tr
                      key={p._id.toString()}
                      className="transition hover:bg-neutral-50/50 dark:hover:bg-neutral-800/40"
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-neutral-900 dark:text-neutral-100">
                          {p.name}
                        </div>
                        <div className="font-mono text-[11px] text-neutral-400">
                          /{p.slug}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-neutral-600 dark:text-neutral-400">
                        <div>{brandName}</div>
                        <div className="text-[11px] text-neutral-400">
                          {categoryName} • {p.gender}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-flex rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                          {p.type}{" "}
                          {p.type === "VARIABLE" ? `(${pVariants.length})` : ""}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-neutral-900 dark:text-neutral-100">
                        {formatCurrency(p.basePricePaise)}
                      </td>

                      {/* Stock Badge */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${stockBadgeClass}`}
                        >
                          <span>●</span>
                          <span>{stockText}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            p.status === "ACTIVE"
                              ? "bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300"
                              : "bg-neutral-200 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-300"
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`/admin/products/${p._id.toString()}/edit`}
                          className="inline-flex items-center rounded-md border border-neutral-200 bg-white px-2.5 py-1 text-xs font-semibold text-neutral-800 shadow-xs hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
                        >
                          Edit
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-neutral-200 bg-neutral-50 px-4 py-3 dark:border-neutral-800 dark:bg-neutral-800/40">
            <span className="text-xs text-neutral-500">
              Showing page{" "}
              <strong className="font-semibold text-neutral-900 dark:text-neutral-100">
                {page}
              </strong>{" "}
              of {totalPages}
            </span>

            <div className="flex items-center gap-2">
              {page > 1 && (
                <Link
                  href={`/admin/products?page=${page - 1}&search=${encodeURIComponent(search)}&brandId=${brandId || ""}&categoryId=${categoryId || ""}&status=${status || ""}&gender=${gender || ""}&type=${type || ""}`}
                  className="rounded border border-neutral-300 bg-white px-2.5 py-1 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                >
                  Previous
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={`/admin/products?page=${page + 1}&search=${encodeURIComponent(search)}&brandId=${brandId || ""}&categoryId=${categoryId || ""}&status=${status || ""}&gender=${gender || ""}&type=${type || ""}`}
                  className="rounded border border-neutral-300 bg-white px-2.5 py-1 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                >
                  Next
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
