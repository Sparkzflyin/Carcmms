import { Receipt } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Card, EmptyState, SectionTitle, Skeleton } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { vehicleCosts } from "@/lib/costs";
import { formatDate, formatMoney, unitLabel, vehicleName, workOrderNumber } from "@/lib/format";
import { EXPENSE_CATEGORY_LABELS, type Vehicle, type Vendor } from "@/lib/types";
import { DeleteExpenseButton, ExpenseForm } from "./expense-form";

export const metadata: Metadata = { title: "Costs" };

const CATEGORY_LABELS = { ...EXPENSE_CATEGORY_LABELS, repairs: "Repairs & maintenance" };

export default function CostsPage({ params }: PageProps<"/vehicles/[id]/costs">) {
  return (
    <Suspense fallback={<Skeleton className="h-[600px]" />}>
      <Costs params={params} />
    </Suspense>
  );
}

async function Costs({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireUser();
  const [{ data }, vendorsRes] = await Promise.all([
    supabase.from("vehicles").select("*").eq("id", id).maybeSingle(),
    supabase.from("vendors").select("id, name").order("name"),
  ]);
  const vehicle = data as Vehicle | null;
  if (!vehicle) notFound();
  const vendors = (vendorsRes.data ?? []) as Pick<Vendor, "id" | "name">[];
  const vendorName = new Map(vendors.map((v) => [v.id, v.name]));

  const costs = await vehicleCosts(supabase, vehicle);
  const unit = unitLabel(vehicle.odometer_unit);
  const year = new Date().getFullYear();
  const thisYear = costs.entries
    .filter((e) => e.date.startsWith(String(year)))
    .reduce((s, e) => s + e.amount, 0);
  const lastYear = costs.entries
    .filter((e) => e.date.startsWith(String(year - 1)))
    .reduce((s, e) => s + e.amount, 0);

  // Last 12 calendar months, oldest first.
  const now = new Date();
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    return {
      key,
      label: d.toLocaleDateString("en-US", { month: "short" }),
      full: d.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      amount: costs.entries.filter((e) => e.date.startsWith(key)).reduce((s, e) => s + e.amount, 0),
    };
  });
  const monthMax = Math.max(...months.map((m) => m.amount), 1);
  const catMax = Math.max(...costs.byCategory.map((c) => c.amount), 1);

  // One ledger: expenses and completed jobs, newest first.
  const ledger = [
    ...costs.expenses.map((e) => ({
      kind: "expense" as const,
      date: e.date,
      amount: Number(e.amount),
      expense: e,
    })),
    ...costs.jobs
      .filter((j) => j.completed_at)
      .map((j) => {
        const parts = j.work_order_parts.reduce(
          (s, p) => s + Number(p.quantity) * Number(p.unit_cost),
          0,
        );
        return {
          kind: "job" as const,
          date: j.completed_at!.slice(0, 10),
          amount: parts + Number(j.labor_hours) * Number(j.labor_rate),
          job: j,
        };
      }),
  ].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 font-mono text-xs tracking-wider text-ink-3 uppercase">
            <Link href={`/vehicles/${vehicle.id}`} className="hover:text-accent">
              {vehicleName(vehicle)}
            </Link>{" "}
            / Costs
          </p>
          <h1 className="font-display text-4xl leading-none font-extrabold tracking-tight uppercase sm:text-5xl">
            Cost of ownership
          </h1>
        </div>
        <ExpenseForm
          vehicleId={vehicle.id}
          odometer={vehicle.odometer}
          unit={vehicle.odometer_unit}
          vendors={vendors}
        />
      </div>

      <div className="mb-8 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line lg:grid-cols-4">
        <Tile label="Total spent" value={formatMoney(costs.total)} />
        <Tile
          label={`Cost per ${unit === "hrs" ? "hour" : unit}`}
          value={costs.costPerDistance != null ? formatMoney(costs.costPerDistance) : "—"}
          sub={
            costs.milesTracked != null && costs.milesTracked > 0
              ? `over ${costs.milesTracked.toLocaleString("en-US")} ${unit}`
              : "Set odometer at purchase"
          }
          href={costs.costPerDistance == null ? `/vehicles/${vehicle.id}/edit` : undefined}
        />
        <Tile label={`${year} so far`} value={formatMoney(thisYear)} />
        <Tile label={String(year - 1)} value={formatMoney(lastYear)} />
      </div>
      {vehicle.purchase_price != null && (
        <p className="-mt-6 mb-8 text-xs text-ink-3">
          Purchase price ({formatMoney(Number(vehicle.purchase_price))}) isn&apos;t included in
          these totals.
        </p>
      )}

      {costs.entries.length === 0 ? (
        <EmptyState icon={<Receipt className="size-8" />} title="Nothing logged yet">
          Add expenses like insurance, registration and tires. Completed work orders count here
          automatically.
        </EmptyState>
      ) : (
        <div className="grid gap-8 lg:grid-cols-2">
          <section>
            <SectionTitle>Last 12 months</SectionTitle>
            <Card className="p-4">
              <div
                className="flex h-44 items-end gap-0.5"
                role="img"
                aria-label="Spending per month for the last 12 months"
              >
                {months.map((m) => (
                  <div
                    key={m.key}
                    className="group relative flex h-full flex-1 flex-col justify-end"
                  >
                    {/* Hit area is the full column; the bar is the mark. */}
                    <div
                      className="rounded-t-[4px] bg-accent transition group-hover:brightness-110"
                      style={{
                        height: m.amount ? `${Math.max(2, (m.amount / monthMax) * 100)}%` : 0,
                      }}
                    />
                    <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 rounded-md border border-line bg-panel px-2 py-1 text-xs whitespace-nowrap shadow-card group-hover:block">
                      <span className="text-ink-3">{m.full}</span>{" "}
                      <span className="font-mono font-semibold text-ink">
                        {formatMoney(m.amount)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-1 flex gap-0.5 border-t border-line pt-1">
                {months.map((m, i) => (
                  <span key={m.key} className="flex-1 text-center text-[10px] text-ink-3">
                    {i % 2 === 0 || months.length < 8 ? m.label : ""}
                  </span>
                ))}
              </div>
              <table className="sr-only">
                <caption>Spending per month</caption>
                <tbody>
                  {months.map((m) => (
                    <tr key={m.key}>
                      <th>{m.full}</th>
                      <td>{formatMoney(m.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </section>

          <section>
            <SectionTitle>By category</SectionTitle>
            <Card className="p-4">
              <ul className="flex flex-col gap-3">
                {costs.byCategory.map((c) => (
                  <li key={c.category}>
                    <div className="mb-1 flex justify-between gap-4 text-sm">
                      <span className="text-ink-2">{CATEGORY_LABELS[c.category]}</span>
                      <span className="font-mono font-semibold">
                        {formatMoney(c.amount)}{" "}
                        <span className="text-xs font-normal text-ink-3">
                          {Math.round((c.amount / costs.total) * 100)}%
                        </span>
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-panel-2">
                      <div
                        className="h-full rounded-full bg-accent"
                        style={{ width: `${(c.amount / catMax) * 100}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          </section>

          <section className="lg:col-span-2">
            <SectionTitle>Ledger</SectionTitle>
            <Card className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-line text-left font-display text-xs tracking-widest text-ink-3 uppercase">
                    <th className="px-4 py-2 font-semibold">Date</th>
                    <th className="px-2 py-2 font-semibold">What</th>
                    <th className="px-2 py-2 font-semibold">Category</th>
                    <th className="px-2 py-2 text-right font-semibold">Odometer</th>
                    <th className="px-2 py-2 text-right font-semibold">Amount</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {ledger.map((row) =>
                    row.kind === "job" ? (
                      <tr key={`j${row.job.id}`}>
                        <td className="px-4 py-2 whitespace-nowrap">{formatDate(row.date)}</td>
                        <td className="px-2 py-2">
                          <Link
                            href={`/work-orders/${row.job.id}`}
                            className="font-semibold hover:text-accent"
                          >
                            {row.job.title}
                          </Link>
                          <span className="ml-2 font-mono text-xs text-ink-3">
                            {workOrderNumber(row.job.number)}
                          </span>
                        </td>
                        <td className="px-2 py-2 text-ink-2">Repairs & maintenance</td>
                        <td className="px-2 py-2 text-right font-mono">
                          {row.job.odometer?.toLocaleString("en-US") ?? "—"}
                        </td>
                        <td className="px-2 py-2 text-right font-mono font-semibold">
                          {formatMoney(row.amount)}
                        </td>
                        <td />
                      </tr>
                    ) : (
                      <tr key={`e${row.expense.id}`}>
                        <td className="px-4 py-2 whitespace-nowrap">{formatDate(row.date)}</td>
                        <td className="px-2 py-2">
                          {row.expense.description ?? CATEGORY_LABELS[row.expense.category]}
                          {row.expense.vendor_id && vendorName.get(row.expense.vendor_id) && (
                            <span className="ml-2 text-xs text-ink-3">
                              {vendorName.get(row.expense.vendor_id)}
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-2 text-ink-2">
                          {CATEGORY_LABELS[row.expense.category]}
                        </td>
                        <td className="px-2 py-2 text-right font-mono">
                          {row.expense.odometer?.toLocaleString("en-US") ?? "—"}
                        </td>
                        <td className="px-2 py-2 text-right font-mono font-semibold">
                          {formatMoney(row.amount)}
                        </td>
                        <td className="pr-2 text-right">
                          <DeleteExpenseButton id={row.expense.id} />
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </Card>
          </section>
        </div>
      )}
    </>
  );
}

function Tile({
  label,
  value,
  sub,
  href,
}: {
  label: string;
  value: string;
  sub?: string;
  href?: string;
}) {
  return (
    <div className="bg-panel px-4 py-3">
      <p className="font-display text-xs font-semibold tracking-widest text-ink-3 uppercase">
        {label}
      </p>
      <p className="font-mono text-2xl font-bold sm:text-3xl">{value}</p>
      {sub &&
        (href ? (
          <Link href={href} className="text-xs font-semibold text-accent hover:underline">
            {sub}
          </Link>
        ) : (
          <p className="text-xs text-ink-3">{sub}</p>
        ))}
    </div>
  );
}
