import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { jobCost, vehicleCosts } from "@/lib/costs";
import { formatDate, formatMoney, formatOdometer, vehicleName, workOrderNumber } from "@/lib/format";
import type { Vehicle } from "@/lib/types";
import { PrintButton } from "./print-button";

export const metadata: Metadata = { title: "Service history" };

export default function PrintHistoryPage({ params }: PageProps<"/print/vehicles/[id]">) {
  return (
    <div className="paper min-h-dvh">
      <Suspense fallback={<p className="p-8 text-sm">Preparing service history…</p>}>
        <History params={params} />
      </Suspense>
    </div>
  );
}

async function History({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireUser();
  const { data } = await supabase.from("vehicles").select("*").eq("id", id).maybeSingle();
  const vehicle = data as Vehicle | null;
  if (!vehicle) notFound();

  const { jobs } = await vehicleCosts(supabase, vehicle);
  const total = jobs.reduce((s, j) => s + jobCost(j), 0);
  const generated = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  const specs = [
    ["VIN", vehicle.vin],
    ["Plate", vehicle.license_plate],
    ["Engine", vehicle.engine],
    ["Transmission", vehicle.transmission],
    ["Color", vehicle.color],
    ["Current odometer", formatOdometer(vehicle.odometer, vehicle.odometer_unit)],
  ].filter(([, v]) => v);

  return (
    <div className="mx-auto max-w-3xl px-6 py-8 print:max-w-none print:p-0">
      <div className="mb-6 flex items-center justify-between gap-4 print:hidden">
        <Link href={`/vehicles/${vehicle.id}`} className="text-sm font-semibold text-ink-2 hover:text-accent">
          ← Back to vehicle
        </Link>
        <PrintButton />
      </div>

      <header className="border-b-2 border-ink pb-4">
        <p className="font-mono text-xs tracking-widest text-ink-3 uppercase">Service history</p>
        <h1 className="font-display text-4xl font-extrabold uppercase">{vehicleName(vehicle)}</h1>
        {vehicle.trim && <p className="text-lg text-ink-2">{vehicle.trim}</p>}
        <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
          {specs.map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs text-ink-3">{label}</dt>
              <dd className={label === "VIN" || label === "Plate" ? "font-mono" : ""}>{value}</dd>
            </div>
          ))}
        </dl>
      </header>

      <p className="my-4 text-sm text-ink-2">
        {jobs.length} completed service record{jobs.length === 1 ? "" : "s"} · {formatMoney(total)} in parts and
        labor · generated {generated}
      </p>

      {jobs.length === 0 ? (
        <p className="py-8 text-center text-ink-3">No completed work orders yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink text-left text-xs tracking-wider text-ink-3 uppercase">
              <th className="py-2 pr-3 font-semibold">Date</th>
              <th className="py-2 pr-3 text-right font-semibold">Odometer</th>
              <th className="py-2 pr-3 font-semibold">Work performed</th>
              <th className="py-2 text-right font-semibold">Cost</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((j) => (
              <tr key={j.id} className="break-inside-avoid border-b border-line align-top">
                <td className="py-2 pr-3 whitespace-nowrap">{formatDate(j.completed_at)}</td>
                <td className="py-2 pr-3 text-right font-mono whitespace-nowrap">
                  {j.odometer != null ? j.odometer.toLocaleString("en-US") : "—"}
                </td>
                <td className="py-2 pr-3">
                  <p className="font-semibold">
                    {j.title} <span className="font-mono text-xs font-normal text-ink-3">{workOrderNumber(j.number)}</span>
                  </p>
                  {j.work_order_parts.length > 0 && (
                    <p className="text-xs text-ink-2">
                      {j.work_order_parts
                        .map((p) => `${p.name}${p.part_number ? ` (${p.part_number})` : ""}${Number(p.quantity) !== 1 ? ` ×${Number(p.quantity)}` : ""}`)
                        .join(", ")}
                    </p>
                  )}
                </td>
                <td className="py-2 text-right font-mono whitespace-nowrap">{jobCost(j) ? formatMoney(jobCost(j)) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <footer className="mt-8 border-t border-line pt-3 font-mono text-[10px] text-ink-3">
        Owner-maintained record from GarageLog. Dates and mileage as logged by the owner.
      </footer>
    </div>
  );
}
