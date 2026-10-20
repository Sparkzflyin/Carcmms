import { ClipboardList, Pencil, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { VehicleArt } from "@/components/vehicle-art";
import { WorkOrderRow } from "@/components/work-order-row";
import { buttonClass, Card, EmptyState, SectionTitle, Skeleton, cx } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { formatDate, formatMoney, formatOdometer, unitLabel, vehicleName } from "@/lib/format";
import { maintenanceState } from "@/lib/maintenance";
import { signPhotoUrls } from "@/lib/storage";
import {
  OPEN_STATUSES,
  type CustomFieldDefinition,
  type MaintenanceSchedule,
  type Vehicle,
  type WorkOrder,
} from "@/lib/types";
import { OdometerForm, ScheduleActions, ScheduleForm } from "./panels";

export const metadata: Metadata = { title: "Vehicle" };

export default function VehiclePage({ params }: PageProps<"/vehicles/[id]">) {
  return (
    <Suspense fallback={<VehicleSkeleton />}>
      <VehicleDetail params={params} />
    </Suspense>
  );
}

async function VehicleDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireUser();
  await supabase.rpc("create_due_maintenance_work_orders");

  const [vehicleRes, ordersRes, schedulesRes, fieldsRes] = await Promise.all([
    supabase.from("vehicles").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("work_orders")
      .select("*")
      .eq("vehicle_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("maintenance_schedules")
      .select("*")
      .eq("vehicle_id", id)
      .order("created_at"),
    supabase
      .from("custom_field_definitions")
      .select("id, label, field_type, options, applies_to, sort_order")
      .order("sort_order"),
  ]);

  const vehicle = vehicleRes.data as Vehicle | null;
  if (!vehicle) notFound();
  const orders = (ordersRes.data ?? []) as WorkOrder[];
  const schedules = (schedulesRes.data ?? []) as MaintenanceSchedule[];
  const fields = (fieldsRes.data ?? []) as CustomFieldDefinition[];

  const photos = await signPhotoUrls(supabase, [vehicle.photo_path]);
  const openOrders = orders.filter((o) => OPEN_STATUSES.includes(o.status));
  const closedOrders = orders.filter((o) => !OPEN_STATUSES.includes(o.status));
  const today = new Date();
  const unit = unitLabel(vehicle.odometer_unit);

  const specs: [string, string | null | undefined][] = [
    ["VIN", vehicle.vin],
    ["Plate", vehicle.license_plate],
    ["Engine", vehicle.engine],
    ["Transmission", vehicle.transmission],
    ["Drivetrain", vehicle.drivetrain],
    ["Body", vehicle.body_style],
    ["Fuel", vehicle.fuel_type],
    ["Color", vehicle.color],
    ["Purchased", vehicle.purchase_date ? formatDate(vehicle.purchase_date) : null],
    ["Price paid", vehicle.purchase_price != null ? formatMoney(vehicle.purchase_price) : null],
    ...fields
      .filter((f) => f.applies_to === "all" || f.applies_to === vehicle.vehicle_type)
      .map((f): [string, string | null] => {
        const v = vehicle.custom_fields?.[f.id];
        if (v == null || v === "") return [f.label, null];
        if (f.field_type === "boolean") return [f.label, v ? "Yes" : "No"];
        if (f.field_type === "date") return [f.label, formatDate(String(v))];
        return [f.label, String(v)];
      }),
  ];
  const filledSpecs = specs.filter(([, v]) => v);

  return (
    <>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="mb-1 font-mono text-xs tracking-wider text-ink-3 uppercase">
            <Link href="/" className="hover:text-accent">Garage</Link> /{" "}
            {vehicle.nickname ?? (vehicle.vehicle_type === "motorcycle" ? "Motorcycle" : "Car")}
            {vehicle.archived && " · Archived"}
          </p>
          <h1 className="font-display text-4xl leading-none font-extrabold tracking-tight uppercase sm:text-5xl">
            {vehicleName(vehicle)}
          </h1>
          {vehicle.trim && <p className="mt-1 text-lg text-ink-2">{vehicle.trim}</p>}
        </div>
        <div className="flex gap-2">
          <Link href={`/vehicles/${vehicle.id}/edit`} className={buttonClass("secondary")}>
            <Pencil className="size-4" /> Edit
          </Link>
          <Link href={`/vehicles/${vehicle.id}/work-orders/new`} className={buttonClass("primary")}>
            <Plus className="size-4" strokeWidth={3} /> New work order
          </Link>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[340px_1fr]">
        {/* Left: photo, odometer, spec sheet */}
        <aside className="flex flex-col gap-4">
          <Card className="overflow-hidden">
            <VehicleArt
              type={vehicle.vehicle_type}
              photoUrl={vehicle.photo_path ? photos.get(vehicle.photo_path) : null}
              alt={vehicleName(vehicle)}
              className="aspect-[4/3] w-full"
            />
          </Card>
          <OdometerForm vehicleId={vehicle.id} odometer={vehicle.odometer} unit={vehicle.odometer_unit} />
          <Card className="p-4">
            <h2 className="mb-3 font-display text-sm font-bold tracking-widest text-ink-3 uppercase">Spec sheet</h2>
            {filledSpecs.length === 0 ? (
              <p className="text-sm text-ink-3">
                No specs yet.{" "}
                <Link href={`/vehicles/${vehicle.id}/edit`} className="font-semibold text-accent hover:underline">
                  Add some
                </Link>
              </p>
            ) : (
              <dl className="divide-y divide-line text-sm">
                {filledSpecs.map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-4 py-1.5">
                    <dt className="text-ink-3">{label}</dt>
                    <dd className={cx("text-right font-medium break-all", (label === "VIN" || label === "Plate") && "font-mono")}>
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
            {vehicle.notes && (
              <p className="mt-3 border-t border-line pt-3 text-sm whitespace-pre-line text-ink-2">{vehicle.notes}</p>
            )}
          </Card>
        </aside>

        {/* Right: work orders + maintenance */}
        <div className="flex min-w-0 flex-col gap-10">
          <section>
            <SectionTitle>
              Open work orders <span className="ml-1 font-mono text-base text-ink-3">{openOrders.length}</span>
            </SectionTitle>
            {openOrders.length === 0 ? (
              <EmptyState icon={<ClipboardList className="size-8" />} title="Nothing open">
                Everything&apos;s buttoned up. Open a work order when something needs fixing.
              </EmptyState>
            ) : (
              <div className="flex flex-col gap-2">
                {openOrders.map((o, i) => (
                  <WorkOrderRow key={o.id} order={o} index={i} />
                ))}
              </div>
            )}
          </section>

          <section>
            <SectionTitle
              action={<ScheduleForm vehicleId={vehicle.id} unit={vehicle.odometer_unit} odometer={vehicle.odometer} />}
            >
              Maintenance schedule
            </SectionTitle>
            {schedules.length === 0 ? (
              <p className="text-sm text-ink-3">
                Add recurring service like oil changes, chain lube or tire rotations. When one comes
                due, a work order opens automatically.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {schedules.map((s) => {
                  const st = maintenanceState(s, vehicle.odometer, today);
                  const remaining = [
                    st.distanceLeft != null &&
                      (st.distanceLeft <= 0
                        ? `${Math.abs(st.distanceLeft).toLocaleString("en-US")} ${unit} overdue`
                        : `${st.distanceLeft.toLocaleString("en-US")} ${unit} left`),
                    st.daysLeft != null &&
                      (st.daysLeft <= 0 ? `${Math.abs(st.daysLeft)} days overdue` : `${st.daysLeft} days left`),
                  ].filter(Boolean);
                  const every = [
                    s.interval_distance && `${s.interval_distance.toLocaleString("en-US")} ${unit}`,
                    s.interval_months && `${s.interval_months} mo`,
                  ].filter(Boolean);
                  return (
                    <li key={s.id}>
                      <Card className="flex items-center gap-4 px-4 py-3">
                        <span
                          className={cx(
                            "h-10 w-1.5 shrink-0 rounded-full",
                            st.status === "due" ? "bg-danger" : st.status === "soon" ? "bg-warn" : "bg-ok",
                          )}
                          aria-hidden
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold">{s.title}</p>
                          <p className="text-xs text-ink-3">
                            Every {every.join(" or ")} · Last done{" "}
                            {s.last_done_odometer != null || s.last_done_date
                              ? [
                                  s.last_done_odometer != null && formatOdometer(s.last_done_odometer, vehicle.odometer_unit),
                                  s.last_done_date && formatDate(s.last_done_date),
                                ]
                                  .filter(Boolean)
                                  .join(", ")
                              : "never"}
                          </p>
                        </div>
                        <p
                          className={cx(
                            "hidden text-right text-sm font-semibold sm:block",
                            st.status === "due" ? "text-danger" : st.status === "soon" ? "text-warn" : "text-ink-2",
                          )}
                        >
                          {remaining.join(" · ")}
                        </p>
                        <ScheduleActions id={s.id} />
                      </Card>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {closedOrders.length > 0 && (
            <section>
              <SectionTitle>
                History <span className="ml-1 font-mono text-base text-ink-3">{closedOrders.length}</span>
              </SectionTitle>
              <div className="flex flex-col gap-2">
                {closedOrders.map((o, i) => (
                  <WorkOrderRow key={o.id} order={o} index={i} />
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </>
  );
}

function VehicleSkeleton() {
  return (
    <>
      <Skeleton className="mb-8 h-16 w-2/3" />
      <div className="grid gap-8 lg:grid-cols-[340px_1fr]">
        <Skeleton className="h-96" />
        <Skeleton className="h-96" />
      </div>
    </>
  );
}
