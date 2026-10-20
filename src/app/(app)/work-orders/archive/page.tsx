import { Archive } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { WorkOrderRow } from "@/components/work-order-row";
import { EmptyState, PageHeader, Skeleton } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { vehicleName } from "@/lib/format";
import type { Vehicle, WorkOrder } from "@/lib/types";
import { WorkOrderTabs } from "../tabs";
import { ArchiveSearchForm } from "./search-form";

export const metadata: Metadata = { title: "Archived work orders" };

const LIMIT = 100;

const SORTS = {
  archived: { column: "archived_at", ascending: false },
  completed: { column: "completed_at", ascending: false },
  oldest: { column: "created_at", ascending: true },
} as const;

export default function ArchivePage({ searchParams }: PageProps<"/work-orders/archive">) {
  return (
    <>
      <PageHeader eyebrow="Across all vehicles" title="Work orders" />
      <div className="mb-6">
        <WorkOrderTabs active="archived" />
      </div>
      <Suspense fallback={<Skeleton className="h-96" />}>
        <ArchiveResults searchParams={searchParams} />
      </Suspense>
    </>
  );
}

function param(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

async function ArchiveResults({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  // Strip characters that have meaning in PostgREST filter syntax.
  const q = param(sp.q).replace(/[,()*%\\"]/g, " ").trim().slice(0, 100);
  const vehicle = param(sp.vehicle);
  const sortKey = param(sp.sort) in SORTS ? (param(sp.sort) as keyof typeof SORTS) : "archived";
  const sort = SORTS[sortKey];

  const { supabase } = await requireUser();

  const { data: vehicleRows } = await supabase
    .from("vehicles")
    .select("id, year, make, model, nickname, vin, license_plate")
    .order("created_at");
  const vehicles = (vehicleRows ?? []) as Pick<
    Vehicle,
    "id" | "year" | "make" | "model" | "nickname" | "vin" | "license_plate"
  >[];

  let query = supabase
    .from("work_orders")
    .select("*, vehicles(year, make, model, nickname)", { count: "exact" })
    .not("archived_at", "is", null)
    .order(sort.column, { ascending: sort.ascending, nullsFirst: false })
    .limit(LIMIT);

  if (vehicle) query = query.eq("vehicle_id", vehicle);

  if (q) {
    const like = `%${q}%`;
    const [parts, notes] = await Promise.all([
      supabase
        .from("work_order_parts")
        .select("work_order_id")
        .or(`name.ilike.${like},part_number.ilike.${like},vendor.ilike.${like}`)
        .limit(150),
      supabase
        .from("work_order_notes")
        .select("work_order_id")
        .eq("kind", "note")
        .ilike("body", like)
        .limit(150),
    ]);

    const needle = q.toLowerCase();
    const matchingVehicles = vehicles.filter((v) =>
      [v.nickname, v.make, v.model, v.vin, v.license_plate, vehicleName(v)]
        .filter(Boolean)
        .some((s) => s!.toLowerCase().includes(needle)),
    );
    // Capped at 150 ids each so the filter fits in the request URL.
    const workOrderIds = new Set(
      [...(parts.data ?? []), ...(notes.data ?? [])].map((r) => r.work_order_id as string),
    );
    // "WO-0042", "wo42" or plain "42" match the work order number.
    const number = q.match(/^(?:wo-?)?0*(\d{1,9})$/i)?.[1];

    const clauses = [`title.ilike.${like}`, `description.ilike.${like}`];
    if (number) clauses.push(`number.eq.${number}`);
    if (matchingVehicles.length) clauses.push(`vehicle_id.in.(${matchingVehicles.map((v) => v.id).join(",")})`);
    if (workOrderIds.size) clauses.push(`id.in.(${[...workOrderIds].join(",")})`);
    query = query.or(clauses.join(","));
  }

  const { data, count, error } = await query;
  if (error) throw error;
  const orders = (data ?? []) as (WorkOrder & {
    vehicles: Pick<Vehicle, "year" | "make" | "model" | "nickname">;
  })[];
  const total = count ?? orders.length;
  const filtered = Boolean(q || vehicle);

  return (
    <>
      <ArchiveSearchForm
        q={param(sp.q)}
        vehicle={vehicle}
        sort={sortKey}
        vehicles={vehicles.map((v) => ({ id: v.id, label: v.nickname ?? vehicleName(v) }))}
      />
      <p className="mt-4 mb-3 font-mono text-xs tracking-wider text-ink-3 uppercase" aria-live="polite">
        {total} archived work order{total === 1 ? "" : "s"}
        {filtered && " matching"}
        {total > LIMIT && ` · showing first ${LIMIT}`}
      </p>
      {orders.length === 0 ? (
        <EmptyState icon={<Archive className="size-8" />} title={filtered ? "No matches" : "Archive is empty"}>
          {filtered
            ? "Try a different word, a part number, or a WO number like WO-0042."
            : "Archive closed work orders to clear them out of your lists. They'll be kept here, searchable."}
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
