import { InventoryTable } from "@/components/admin/InventoryTable";

export default function AdminInventoryPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            Inventory & Stock Control
          </h1>
          <p className="text-sm text-neutral-500">
            Real-time SKU variant stock tracking, atomic adjustments, threshold alerts, and audit movements.
          </p>
        </div>
      </div>

      <InventoryTable />
    </div>
  );
}
