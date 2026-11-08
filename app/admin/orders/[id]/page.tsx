import { OrderDetailView } from "@/components/admin/OrderDetailView";

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <OrderDetailView orderId={id} />;
}

