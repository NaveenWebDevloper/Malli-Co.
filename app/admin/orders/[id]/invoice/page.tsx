import { InvoiceView } from "@/components/admin/InvoiceView";

export default async function AdminOrderInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <InvoiceView orderId={id} />;
}

