import { CalendarClock, ClipboardList, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { VehicleArt } from "@/components/vehicle-art";
import { buttonClass, Card, EmptyState, PageHeader, Skeleton } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { formatOdometer, vehicleName } from "@/lib/format";
import { maintenanceState } from "@/lib/maintenance";
import { signPhotoUrls } from "@/lib/storage";
import { OPEN_STATUSES, type MaintenanceSchedule, type Vehicle, type WorkOrder } from "@/lib/types";

export const metadata: Metadata = { title: "Garage" };

export default function GaragePage() {
  return (
    <>
      <PageHeader eyebrow="Your vehicles" title="Garage">
        <Link href="/vehicles/new" className={buttonClass("primary")}>
          <Plus className="size-4" strokeWidth={3} />
          Add vehicle
        </Link>
      </PageHeader>
      <Suspense fallback={<GarageSkeleton />}>
        <Garage />
      </Suspense>
    </>
  );
}

async function Garage() {
  const { supabase } = await requireUser();

  // Open work orders for any maintenance that has come due since the last visit.
  await supabase.rpc("create_due_maintenance_work_orders");

  const [vehiclesRes, ordersRes, schedulesRes] = await Promise.all([
    supabase
      .from("vehicles")
      .select("*")
      .eq("archived", false)
      .order("created_at", { ascending: true }),
    supabase.from("work_orders").select("vehicle_id, status, priority").in("status", OPEN_STATUSES),
    supabase.from("maintenance_schedules").select("*").eq("active", true),
  ]);

  if (vehiclesRes.error) throw vehiclesRes.error;
  // The client is untyped (no generated DB types yet), so rows come back as `any`.
  const vehicles = vehiclesRes.data as Vehicle[];
  const openOrders = (ordersRes.data ?? []) as Pick<
    WorkOrder,
    "vehicle_id" | "status" | "priority"
  >[];
  const schedules = (schedulesRes.data ?? []) as MaintenanceSchedule[];

  if (vehicles.length === 0) {
    return (
      <EmptyState title="Your garage is empty">
        <p>Add a car or motorcycle to start tracking work orders and maintenance.</p>
        <Link href="/vehicles/new" className={buttonClass("primary", "sm") + " mt-5"}>
          <Plus className="size-4" strokeWidth={3} /> Add your first vehicle
        </Link>
      </EmptyState>
    );
  }

  const photos = await signPhotoUrls(
    supabase,
    vehicles.map((v) => v.photo_path),
  );
  const today = new Date();

  const totals = {
    open: openOrders.length,
    inProgress: openOrders.filter((o) => o.status === "in_progress").length,
    critical: openOrders.filter((o) => o.priority === "critical").length,
  };

  return (
    <>
      <div className="mb-8 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-4">
        <Stat label="Vehicles" value={vehicles.length} />
        <Stat label="Open work orders" value={totals.open} />
        <Stat label="In progress" value={totals.inProgress} accent={totals.inProgress > 0} />
        <Stat label="Critical" value={totals.critical} danger={totals.critical > 0} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {vehicles.map((vehicle, i) => {
          const orders = openOrders.filter((o) => o.vehicle_id === vehicle.id);
          const hasCritical = orders.some((o) => o.priority === "critical");
          const upcoming = schedules
            .filter((s) => s.vehicle_id === vehicle.id)
            .map((s) => maintenanceState(s, vehicle.odometer, today))
            .filter((s) => s.status !== "ok");
          const dueCount = upcoming.filter((s) => s.status === "due").length;

          return (
            <Link
              key={vehicle.id}
              href={`/vehicles/${vehicle.id}`}
              className="rise group block focus-visible:outline-none"
              style={{ ["--i" as string]: i }}
            >
              <Card className="overflow-hidden transition group-hover:-translate-y-0.5 group-hover:border-line-strong group-focus-visible:ring-2 group-focus-visible:ring-accent">
                <div className="relative">
                  <VehicleArt
                    type={vehicle.vehicle_type}
                    photoUrl={vehicle.photo_path ? photos.get(vehicle.photo_path) : null}
                    alt={vehicleName(vehicle)}
                    className="aspect-[16/9] w-full"
                  />
                  {hasCritical && <div className="hazard absolute inset-x-0 bottom-0 h-1.5" />}
                  {vehicle.license_plate && (
                    <span className="absolute top-3 right-3 rounded-sm border-2 border-[#16181a] bg-[#f3efe2] px-2 py-0.5 font-mono text-xs font-bold tracking-widest text-[#16181a] uppercase shadow">
                      {vehicle.license_plate}
                    </span>
                  )}
                </div>
                <div className="p-4">
                  <p className="font-mono text-xs tracking-wider text-ink-3 uppercase">
                    {vehicle.nickname ??
                      (vehicle.vehicle_type === "motorcycle" ? "Motorcycle" : "Car")}
                  </p>
                  <h2 className="font-display text-2xl leading-tight font-bold uppercase">
                    {vehicleName(vehicle)}
                  </h2>
                  {vehicle.trim && <p className="text-sm text-ink-2">{vehicle.trim}</p>}
                  <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-3 text-sm">
                    <div>
                      <dt className="text-xs text-ink-3">Odometer</dt>
                      <dd className="font-mono font-semibold">
                        {formatOdometer(vehicle.odometer, vehicle.odometer_unit)}
                      </dd>
                    </div>
                    <div>
                      <dt className="flex items-center gap-1 text-xs text-ink-3">
                        <ClipboardList className="size-3" /> Open
                      </dt>
                      <dd className="font-mono font-semibold">{orders.length}</dd>
                    </div>
                    <div>
                      <dt className="flex items-center gap-1 text-xs text-ink-3">
                        <CalendarClock className="size-3" /> Service
                      </dt>
                      <dd
                        className={
                          dueCount > 0
                            ? "font-semibold text-danger"
                            : upcoming.length > 0
                              ? "font-semibold text-warn"
                              : "font-semibold text-ok"
                        }
                      >
                        {dueCount > 0 ? `${dueCount} due` : upcoming.length > 0 ? "Soon" : "OK"}
                      </dd>
                    </div>
                  </dl>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </>
  );
}

function Stat({
  label,
  value,
  accent,
  danger,
}: {
  label: string;
  value: number;
  accent?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="bg-panel px-4 py-3">
      <p className="font-display text-xs font-semibold tracking-widest text-ink-3 uppercase">
        {label}
      </p>
      <p
        className={
          "font-display text-4xl font-extrabold " +
          (danger ? "text-danger" : accent ? "text-accent" : "text-ink")
        }
      >
        {value}
      </p>
    </div>
  );
}

function GarageSkeleton() {
  return (
    <>
      <Skeleton className="mb-8 h-[74px]" />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-80" />
        ))}
      </div>
    </>
  );
}
