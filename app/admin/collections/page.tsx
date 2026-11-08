import { Metadata } from "next";
import { CollectionsManager } from "@/components/admin/CollectionsManager";

export const metadata: Metadata = {
  title: "Curated Collections | Malli & Co. Admin",
  description: "Curate manual showcases or dynamic algorithmic shelves across the storefront.",
};

export default function AdminCollectionsPage() {
  return (
    <div className="space-y-6">
      <CollectionsManager />
    </div>
  );
}

