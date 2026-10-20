import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Expense, ExpenseCategory, Vehicle, WorkOrder } from "./types";

export type CompletedJob = Pick<
  WorkOrder,
  "id" | "number" | "title" | "status" | "odometer" | "completed_at" | "labor_hours" | "labor_rate" | "maintenance_schedule_id"
> & {
  work_order_parts: { name: string; part_number: string | null; quantity: number; unit_cost: number }[];
};

export type CostEntry = {
  date: string; // yyyy-mm-dd
  amount: number;
  category: ExpenseCategory | "repairs";
};

export type CostSummary = {
  jobs: CompletedJob[];
  expenses: Expense[];
  entries: CostEntry[];
  total: number;
  byCategory: { category: CostEntry["category"]; amount: number }[];
  milesTracked: number | null;
  startOdometer: number | null;
  costPerDistance: number | null;
};

export function jobCost(job: Pick<CompletedJob, "labor_hours" | "labor_rate" | "work_order_parts">) {
  const parts = job.work_order_parts.reduce((s, p) => s + Number(p.quantity) * Number(p.unit_cost), 0);
  return parts + Number(job.labor_hours) * Number(job.labor_rate);
}

// Everything spent on a vehicle: completed work orders (parts + labor,
// archived included) plus logged expenses. The purchase price is left out.
export async function vehicleCosts(
  supabase: SupabaseClient,
  vehicle: Pick<Vehicle, "id" | "odometer" | "purchase_odometer">,
): Promise<CostSummary> {
  const [jobsRes, expensesRes] = await Promise.all([
    supabase
      .from("work_orders")
      .select(
        "id, number, title, status, odometer, completed_at, labor_hours, labor_rate, maintenance_schedule_id, work_order_parts(name, part_number, quantity, unit_cost)",
      )
      .eq("vehicle_id", vehicle.id)
      .eq("status", "done")
      .order("completed_at", { ascending: false }),
    supabase
      .from("expenses")
      .select("*")
      .eq("vehicle_id", vehicle.id)
      .order("date", { ascending: false }),
  ]);
  const jobs = (jobsRes.data ?? []) as CompletedJob[];
  const expenses = (expensesRes.data ?? []) as Expense[];

  const entries: CostEntry[] = [
    ...jobs
      .filter((j) => j.completed_at)
      .map((j) => ({ date: j.completed_at!.slice(0, 10), amount: jobCost(j), category: "repairs" as const })),
    ...expenses.map((e) => ({ date: e.date, amount: Number(e.amount), category: e.category })),
  ].filter((e) => e.amount > 0);

  const totals = new Map<CostEntry["category"], number>();
  for (const e of entries) totals.set(e.category, (totals.get(e.category) ?? 0) + e.amount);
  const byCategory = [...totals.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
  const total = entries.reduce((s, e) => s + e.amount, 0);

  // Distance covered since we started knowing about the vehicle.
  const readings = [
    vehicle.purchase_odometer,
    ...jobs.map((j) => j.odometer),
    ...expenses.map((e) => e.odometer),
  ].filter((n): n is number => n != null && n >= 0);
  const startOdometer = vehicle.purchase_odometer ?? (readings.length ? Math.min(...readings) : null);
  const milesTracked = startOdometer != null ? vehicle.odometer - startOdometer : null;
  const costPerDistance = milesTracked && milesTracked > 0 ? total / milesTracked : null;

  return { jobs, expenses, entries, total, byCategory, milesTracked, startOdometer, costPerDistance };
}
