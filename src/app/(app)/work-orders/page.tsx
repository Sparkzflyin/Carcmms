import { ClipboardList } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { WorkOrderRow } from "@/components/work-order-row";
import { EmptyState, PageHeader, Skeleton } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { vehicleName } from "@/lib/format";
import {
  CLOSED_STATUSES,
  OPEN_STATUSES,
  type Vehicle,
  type WorkOrder,
  type WorkOrderStatus,
} from "@/lib/types";
import { ArchiveAllClosedButton } from "./[id]/controls";
import { WorkOrderTabs, type TabKey } from "./tabs";

export const metadata: Metadata = { title: "Work orders" };

const FILTERS: { key: Exclude<TabKey, "archived">; statuses: WorkOrderStatus[] }[] = [
  { key: "open", statuses: OPEN_STATUSES },
  { key: "in_progress", statuses: ["in_progress"] },
  { key: "waiting_parts", statuses: ["waiting_parts"] },
  { key: "closed", statuses: CLOSED_STATUSES },
];

const PRIORITY_RANK = { critical: 0, high: 1, medium: 2, low: 3 };

export default function WorkOrdersPage({ searchParams }: PageProps<"/work-orders">) {
  return (
    <>
      <PageHeader eyebrow="Across all vehicles" title="Work orders" />
      <Suspense fallback={<Skeleton className="h-96" />}>
        <WorkOrders searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function WorkOrders({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { filter: raw } = await searchParams;
  const filter = FILTERS.find((f) => f.key === raw) ?? FILTERS[0];
  const { supabase } = await requireUser();

  const { data } = await supabase
    .from("work_orders")
    .select("*, vehicles(year, make, model, nickname)")
    .in("status", filter.statuses)
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .limit(200);

  const orders = (data ?? []) as (WorkOrder & {
    vehicles: Pick<Vehicle, "year" | "make" | "model" | "nickname">;
  })[];
  // Open work: most urgent first. Closed: most recent first (query order).
  if (filter.key !== "closed") {
    orders.sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <WorkOrderTabs active={filter.key} />
        {filter.key === "closed" && <ArchiveAllClosedButton count={orders.length} />}
      </div>
      {orders.length === 0 ? (
        <EmptyState icon={<ClipboardList className="size-8" />} title="No work orders here">
          Open a work order from any vehicle in your garage.
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-2">
          {orders.map((o, i) => (
            <WorkOrderRow
              key={o.id}
              order={o}
              index={i}
              vehicleLabel={o.vehicles.nickname ?? vehicleName(o.vehicles)}
            />
          ))}
        </div>
      )}
    </>
  );
}
