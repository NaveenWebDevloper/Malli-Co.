export const dynamic = "force-dynamic";
import { CategoriesManager } from "@/components/admin/CategoriesManager";

export const metadata = {
  title: "Categories Taxonomy | Admin Console | Malli & Co.",
};

export default function AdminCategoriesPage() {
  return <CategoriesManager />;
}
