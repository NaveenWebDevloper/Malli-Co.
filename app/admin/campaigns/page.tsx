import type { Metadata } from "next";
import { CampaignsManager } from "@/components/admin/CampaignsManager";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sales & Offers | Admin Console | Malli & Co.",
  description: "Configure promotions, festive sales, flash discounts, target scope, and live pricing rules.",
};

export default function AdminCampaignsPage() {
  return (
    <div className="space-y-6">
      <CampaignsManager />
    </div>
  );
}

