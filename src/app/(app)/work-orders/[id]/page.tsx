import { Archive, CalendarClock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { LocalTime } from "@/components/local-time";
import { Card, PriorityBadge, SectionTitle, Skeleton, StatusBadge, cx } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import {
  formatDate,
  formatMoney,
  formatOdometer,
  vehicleName,
  workOrderNumber,
} from "@/lib/format";
import { signPhotoUrls } from "@/lib/storage";
import type {
  ChecklistItem,
  ChecklistTemplate,
  InventoryItem,
  Vehicle,
  Vendor,
  WorkOrder,
  WorkOrderNote,
  WorkOrderPart,
} from "@/lib/types";
import { WorkOrderChecklist } from "./checklist";
import {
  AddNoteForm,
  AddPartForm,
  ArchiveButton,
  DeleteNoteButton,
  DeletePartButton,
  DeleteWorkOrderButton,
  EditDetails,
  PartStatusSelect,
  StatusStepper,
} from "./controls";

export const metadata: Metadata = { title: "Work order" };

export default function WorkOrderPage({ params }: PageProps<"/work-orders/[id]">) {
  return (
    <Suspense fallback={<Skeleton className="h-[600px]" />}>
      <WorkOrderDetail params={params} />
    </Suspense>
  );
}

type OrderWithVehicle = WorkOrder & {
  vehicles: Pick<Vehicle, "id" | "year" | "make" | "model" | "nickname" | "odometer_unit" | "vehicle_type">;
};

async function WorkOrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await requireUser();

  const [orderRes, partsRes, notesRes, checklistRes, templatesRes, stockRes, vendorsRes] = await Promise.all([
    supabase
      .from("work_orders")
      .select("*, vehicles(id, year, make, model, nickname, odometer_unit, vehicle_type)")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("work_order_parts").select("*").eq("work_order_id", id).order("created_at"),
    supabase
      .from("work_order_notes")
      .select("*")
      .eq("work_order_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("work_order_checklist_items")
      .select("*")
      .eq("work_order_id", id)
      .order("sort_order")
      .order("created_at"),
    supabase.from("checklist_templates").select("id, name, applies_to").order("name"),
    supabase
      .from("inventory_items")
      .select("id, name, part_number, quantity, unit, unit_cost, vendor_id")
      .gt("quantity", 0)
      .order("name"),
    supabase.from("vendors").select("id, name, website").order("name"),
  ]);

  const order = orderRes.data as OrderWithVehicle | null;
  if (!order) notFound();
  const parts = (partsRes.data ?? []) as WorkOrderPart[];
  const notes = (notesRes.data ?? []) as WorkOrderNote[];
  const vehicle = order.vehicles;
  const checklist = (checklistRes.data ?? []) as ChecklistItem[];
  const templates = ((templatesRes.data ?? []) as Pick<ChecklistTemplate, "id" | "name" | "applies_to">[]).filter(
    (t) => t.applies_to === "all" || t.applies_to === vehicle.vehicle_type,
  );
  const stock = (stockRes.data ?? []) as Pick<
    InventoryItem,
    "id" | "name" | "part_number" | "quantity" | "unit" | "unit_cost" | "vendor_id"
  >[];
  const vendors = (vendorsRes.data ?? []) as Pick<Vendor, "id" | "name" | "website">[];
  const vendorById = new Map(vendors.map((v) => [v.id, v]));
  const photos = await signPhotoUrls(supabase, notes.flatMap((n) => n.photo_paths));

  const partsTotal = parts.reduce((sum, p) => sum + Number(p.quantity) * Number(p.unit_cost), 0);
  const laborTotal = Number(order.labor_hours) * Number(order.labor_rate);
  const partsOutstanding = parts.filter((p) => p.status === "needed" || p.status === "ordered").length;

  return (
    <>
      <div className="mb-6">
        <p className="mb-1 font-mono text-xs tracking-wider text-ink-3 uppercase">
          <Link href={`/vehicles/${vehicle.id}`} className="hover:text-accent">
            {vehicleName(vehicle)}
          </Link>{" "}
          / {workOrderNumber(order.number)}
        </p>
        <h1 className="font-display text-4xl leading-none font-extrabold tracking-tight uppercase sm:text-5xl">
          {order.title}
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <StatusBadge status={order.status} />
          <PriorityBadge priority={order.priority} />
          {order.maintenance_schedule_id && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-ink-3">
              <CalendarClock className="size-3.5" /> From maintenance schedule
            </span>
          )}
        </div>
      </div>

      {order.archived_at && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line-strong bg-panel-2 px-4 py-3">
          <p className="flex items-center gap-2 text-sm text-ink-2">
            <Archive className="size-4" />
            Archived <LocalTime iso={order.archived_at} />. It&apos;s hidden from your lists but still searchable.
          </p>
          <div className="w-full sm:w-auto">
            <ArchiveButton id={order.id} archived variant="primary" />
          </div>
        </div>
      )}

      <div className="mb-8">
        <StatusStepper id={order.id} status={order.status} />
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
        <div className="flex min-w-0 flex-col gap-10">
          <section>
            <SectionTitle action={<EditDetails order={order} />}>Details</SectionTitle>
            {order.description ? (
              <p className="whitespace-pre-line text-ink-2">{order.description}</p>
            ) : (
              <p className="text-sm text-ink-3">No description.</p>
            )}
          </section>

          <section>
            <SectionTitle>Checklist</SectionTitle>
            <WorkOrderChecklist workOrderId={order.id} items={checklist} templates={templates} />
          </section>

          <section>
            <SectionTitle action={<AddPartForm workOrderId={order.id} stock={stock} vendors={vendors} />}>
              Parts{" "}
              {partsOutstanding > 0 && (
                <span className="ml-1 font-mono text-sm text-warn">{partsOutstanding} outstanding</span>
              )}
            </SectionTitle>
            {parts.length === 0 ? (
              <p className="text-sm text-ink-3">No parts yet.</p>
            ) : (
              <Card className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead>
                    <tr className="border-b border-line text-left font-display text-xs tracking-widest text-ink-3 uppercase">
                      <th className="px-4 py-2 font-semibold">Part</th>
                      <th className="px-2 py-2 font-semibold">Status</th>
                      <th className="px-2 py-2 text-right font-semibold">Qty</th>
                      <th className="px-2 py-2 text-right font-semibold">Unit</th>
                      <th className="px-2 py-2 text-right font-semibold">Total</th>
                      <th className="w-10" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {parts.map((p) => (
                      <tr key={p.id}>
                        <td className="px-4 py-2">
                          <p className="font-semibold">{p.name}</p>
                          {(p.part_number || p.vendor || p.inventory_item_id) && (
                            <p className="text-xs text-ink-3">
                              {p.part_number && <span className="font-mono">{p.part_number}</span>}
                              {p.part_number && p.vendor && " · "}
                              {p.vendor_id && vendorById.get(p.vendor_id)?.website ? (
                                <a href={vendorById.get(p.vendor_id)!.website!} target="_blank" rel="noreferrer" className="text-accent hover:underline">
                                  {p.vendor}
                                </a>
                              ) : (
                                p.vendor
                              )}
                              {p.inventory_item_id && (
                                <span className="ml-1.5 rounded-sm bg-ok-soft px-1.5 py-px font-display font-bold tracking-wider text-ok uppercase">
                                  From stock
                                </span>
                              )}
                            </p>
                          )}
                        </td>
                        <td className="px-2 py-2">
                          <PartStatusSelect id={p.id} status={p.status} />
                        </td>
                        <td className="px-2 py-2 text-right font-mono">{Number(p.quantity)}</td>
                        <td className="px-2 py-2 text-right font-mono">{formatMoney(Number(p.unit_cost))}</td>
                        <td className="px-2 py-2 text-right font-mono font-semibold">
                          {formatMoney(Number(p.quantity) * Number(p.unit_cost))}
                        </td>
                        <td className="pr-2 text-right">
                          <DeletePartButton id={p.id} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            )}
          </section>

          <section>
            <SectionTitle>Notes & photos</SectionTitle>
            <AddNoteForm workOrderId={order.id} userId={user.id} />
            <ol className="mt-6 flex flex-col gap-4 border-l-2 border-line pl-5">
              {notes.map((note) => (
                <li key={note.id} className="relative">
                  <span
                    className={cx(
                      "absolute top-1.5 -left-[27px] size-3 rounded-full border-2 border-bg",
                      note.kind === "status" ? "bg-ink-3" : "bg-accent",
                    )}
                    aria-hidden
                  />
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-mono text-xs text-ink-3"><LocalTime iso={note.created_at} withTime /></p>
                    {note.kind === "note" && <DeleteNoteButton id={note.id} />}
                  </div>
                  {note.body && (
                    <p className={cx("whitespace-pre-line", note.kind === "status" ? "text-sm text-ink-3 italic" : "text-ink")}>
                      {note.body}
                    </p>
                  )}
                  {note.photo_paths.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {note.photo_paths.map((path) => {
                        const url = photos.get(path);
                        return url ? (
                          <a key={path} href={url} target="_blank" rel="noreferrer">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={url} alt="Work order photo" className="size-28 rounded-md border border-line object-cover hover:opacity-90" />
                          </a>
                        ) : null;
                      })}
                    </div>
                  )}
                </li>
              ))}
              <li className="relative">
                <span className="absolute top-1.5 -left-[27px] size-3 rounded-full border-2 border-bg bg-line-strong" aria-hidden />
                <p className="font-mono text-xs text-ink-3"><LocalTime iso={order.created_at} withTime /></p>
                <p className="text-sm text-ink-3 italic">Work order opened</p>
              </li>
            </ol>
          </section>
        </div>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
          <Card className="overflow-hidden">
            <div className="bg-ink px-4 py-3 text-bg">
              <p className="font-display text-xs font-semibold tracking-widest uppercase opacity-70">Total cost</p>
              <p className="font-mono text-3xl font-bold">{formatMoney(partsTotal + laborTotal)}</p>
            </div>
            <dl className="divide-y divide-line px-4 text-sm">
              <Row label="Parts">{formatMoney(partsTotal)}</Row>
              <Row label={`Labor (${Number(order.labor_hours)} h × ${formatMoney(Number(order.labor_rate))})`}>
                {formatMoney(laborTotal)}
              </Row>
            </dl>
          </Card>
          <Card className="px-4 py-2">
            <dl className="divide-y divide-line text-sm">
              <Row label="Number">
                <span className="font-mono">{workOrderNumber(order.number)}</span>
              </Row>
              <Row label="Odometer">
                <span className="font-mono">{formatOdometer(order.odometer, vehicle.odometer_unit)}</span>
              </Row>
              <Row label="Due">{formatDate(order.due_date)}</Row>
              <Row label="Opened"><LocalTime iso={order.created_at} /></Row>
              <Row label="Started"><LocalTime iso={order.started_at} /></Row>
              <Row label="Completed"><LocalTime iso={order.completed_at} /></Row>
            </dl>
          </Card>
          {!order.archived_at &&
            (order.status === "done" || order.status === "cancelled" ? (
              <ArchiveButton id={order.id} archived={false} />
            ) : (
              <p className="text-center text-xs text-ink-3">
                Close this work order (Done or Cancelled) to archive it.
              </p>
            ))}
          <DeleteWorkOrderButton id={order.id} vehicleId={vehicle.id} />
        </aside>
      </div>
    </>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2">
      <dt className="text-ink-3">{label}</dt>
      <dd className="text-right font-medium">{children}</dd>
    </div>
  );
}
