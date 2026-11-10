import { Metadata } from "next";
import { CollectionsManager } from "@/components/admin/CollectionsManager";

export const metadata: Metadata = {
  title: "Collections | Malli & Co. Admin",
  description: "Create manual showcases or dynamic shelves across the storefront.",
};

export default function AdminCollectionsPage() {
  return (
    <div className="space-y-6">
      <CollectionsManager />
    </div>
  );
}

