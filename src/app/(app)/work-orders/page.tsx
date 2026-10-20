import { ClipboardList } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { WorkOrderRow } from "@/components/work-order-row";
import { EmptyState, PageHeader, Skeleton, cx } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { vehicleName } from "@/lib/format";
import { OPEN_STATUSES, type Vehicle, type WorkOrder, type WorkOrderStatus } from "@/lib/types";

export const metadata: Metadata = { title: "Work orders" };

const FILTERS: { key: string; label: string; statuses: WorkOrderStatus[] }[] = [
  { key: "open", label: "All open", statuses: OPEN_STATUSES },
  { key: "in_progress", label: "In progress", statuses: ["in_progress"] },
  { key: "waiting_parts", label: "Waiting on parts", statuses: ["waiting_parts"] },
  { key: "closed", label: "Closed", statuses: ["done", "cancelled"] },
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
      <nav className="mb-6 flex flex-wrap gap-2" aria-label="Filter work orders">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.key === "open" ? "/work-orders" : `/work-orders?filter=${f.key}`}
            className={cx(
              "rounded-full border px-3.5 py-1 font-display text-sm font-bold tracking-wider uppercase transition",
              f.key === filter.key
                ? "border-ink bg-ink text-bg"
                : "border-line-strong text-ink-2 hover:border-ink-3 hover:text-ink",
            )}
          >
            {f.label}
          </Link>
        ))}
      </nav>
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
