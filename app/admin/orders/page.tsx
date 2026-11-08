import { OrdersTable } from "@/components/admin/OrdersTable";

export default function AdminOrdersPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            Orders & Fulfillment
          </h1>
          <p className="text-sm text-neutral-500">
            Monitor customer orders, manage validated lifecycle status transitions, and issue GST tax invoices.
          </p>
        </div>
      </div>

      <OrdersTable />
    </div>
  );
}
