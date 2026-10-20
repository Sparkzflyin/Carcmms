import {
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Receipt,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageHeader, Skeleton, buttonClass, cx } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { formatMoney, vehicleName, workOrderNumber } from "@/lib/format";
import {
  EXPENSE_CATEGORY_LABELS,
  OPEN_STATUSES,
  type Expense,
  type MaintenanceSchedule,
  type Vehicle,
  type WorkOrder,
} from "@/lib/types";

export const metadata: Metadata = { title: "Calendar" };

type EventKind = "due" | "service" | "done" | "expense";
type CalEvent = {
  date: string;
  kind: EventKind;
  title: string;
  vehicle: string;
  href: string;
  overdue?: boolean;
};

const KIND = {
  due: {
    label: "Work order due",
    icon: ClipboardList,
    cls: "border-accent/40 bg-accent-soft text-ink",
  },
  service: {
    label: "Service due",
    icon: CalendarClock,
    cls: "border-warn/40 bg-warn-soft text-ink",
  },
  done: { label: "Completed", icon: CheckCircle2, cls: "border-ok/30 bg-ok-soft text-ink" },
  expense: { label: "Expense", icon: Receipt, cls: "border-line bg-panel-2 text-ink-2" },
} satisfies Record<EventKind, { label: string; icon: typeof ClipboardList; cls: string }>;

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export default function CalendarPage({ searchParams }: PageProps<"/calendar">) {
  return (
    <>
      <PageHeader eyebrow="Due dates, service and history" title="Calendar" />
      <Suspense fallback={<Skeleton className="h-[640px]" />}>
        <Calendar searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Calendar({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const { supabase } = await requireUser();

  const today = new Date();
  const todayIso = iso(today);
  const monthParam = (Array.isArray(sp.month) ? sp.month[0] : sp.month) ?? "";
  const [y, m] = /^\d{4}-\d{2}$/.test(monthParam)
    ? monthParam.split("-").map(Number)
    : [today.getFullYear(), today.getMonth() + 1];
  const first = new Date(y, m - 1, 1);
  const gridStart = new Date(first);
  gridStart.setDate(1 - first.getDay());
  const days = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });
  // Drop a trailing week that's entirely next month.
  const visible = days.slice(0, days[35].getMonth() === m - 1 ? 42 : 35);
  const from = iso(visible[0]);
  const to = iso(visible[visible.length - 1]);

  const [vehiclesRes, dueRes, doneRes, schedulesRes, expensesRes] = await Promise.all([
    supabase.from("vehicles").select("id, year, make, model, nickname").eq("archived", false),
    supabase
      .from("work_orders")
      .select("id, vehicle_id, number, title, due_date, status")
      .in("status", OPEN_STATUSES)
      .gte("due_date", from)
      .lte("due_date", to),
    supabase
      .from("work_orders")
      .select("id, vehicle_id, number, title, completed_at")
      .eq("status", "done")
      .gte("completed_at", `${from}T00:00:00`)
      .lte("completed_at", `${to}T23:59:59`),
    supabase
      .from("maintenance_schedules")
      .select("*")
      .eq("active", true)
      .not("interval_months", "is", null),
    supabase
      .from("expenses")
      .select("id, vehicle_id, date, category, amount, description")
      .gte("date", from)
      .lte("date", to),
  ]);

  const vehicles = new Map(
    (
      (vehiclesRes.data ?? []) as Pick<Vehicle, "id" | "year" | "make" | "model" | "nickname">[]
    ).map((v) => [v.id, v.nickname ?? vehicleName(v)]),
  );
  const events: CalEvent[] = [];

  for (const o of (dueRes.data ?? []) as Pick<
    WorkOrder,
    "id" | "vehicle_id" | "number" | "title" | "due_date"
  >[]) {
    if (!vehicles.has(o.vehicle_id)) continue;
    events.push({
      date: o.due_date!,
      kind: "due",
      title: `${workOrderNumber(o.number)} ${o.title}`,
      vehicle: vehicles.get(o.vehicle_id)!,
      href: `/work-orders/${o.id}`,
      overdue: o.due_date! < todayIso,
    });
  }
  for (const o of (doneRes.data ?? []) as Pick<
    WorkOrder,
    "id" | "vehicle_id" | "number" | "title" | "completed_at"
  >[]) {
    if (!vehicles.has(o.vehicle_id)) continue;
    events.push({
      date: iso(new Date(o.completed_at!)),
      kind: "done",
      title: o.title,
      vehicle: vehicles.get(o.vehicle_id)!,
      href: `/work-orders/${o.id}`,
    });
  }
  for (const s of (schedulesRes.data ?? []) as MaintenanceSchedule[]) {
    if (!vehicles.has(s.vehicle_id)) continue;
    const next = new Date(`${s.last_done_date ?? s.created_at.slice(0, 10)}T00:00:00`);
    next.setMonth(next.getMonth() + s.interval_months!);
    const date = iso(next);
    // Overdue service shows on today so it isn't lost in a past month.
    const shown = date < todayIso ? todayIso : date;
    if (shown >= from && shown <= to) {
      events.push({
        date: shown,
        kind: "service",
        title: s.title,
        vehicle: vehicles.get(s.vehicle_id)!,
        href: `/vehicles/${s.vehicle_id}`,
        overdue: date < todayIso,
      });
    }
  }
  for (const e of (expensesRes.data ?? []) as Pick<
    Expense,
    "id" | "vehicle_id" | "date" | "category" | "amount" | "description"
  >[]) {
    if (!vehicles.has(e.vehicle_id)) continue;
    events.push({
      date: e.date,
      kind: "expense",
      title: `${formatMoney(Number(e.amount))} ${e.description ?? EXPENSE_CATEGORY_LABELS[e.category]}`,
      vehicle: vehicles.get(e.vehicle_id)!,
      href: `/vehicles/${e.vehicle_id}/costs`,
    });
  }

  const byDay = new Map<string, CalEvent[]>();
  const order: EventKind[] = ["due", "service", "done", "expense"];
  for (const e of events) byDay.set(e.date, [...(byDay.get(e.date) ?? []), e]);
  for (const list of byDay.values())
    list.sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind));

  const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  const prev = monthKey(new Date(y, m - 2, 1));
  const next = monthKey(new Date(y, m, 1));
  const monthEvents = events
    .filter((e) => e.date.startsWith(monthKey(first)))
    .sort((a, b) => a.date.localeCompare(b.date) || order.indexOf(a.kind) - order.indexOf(b.kind));

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-3xl font-extrabold uppercase">
          {first.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        </h2>
        <div className="flex items-center gap-1">
          <Link
            href={`/calendar?month=${prev}`}
            className={buttonClass("secondary", "sm")}
            aria-label="Previous month"
          >
            <ChevronLeft className="size-4" />
          </Link>
          <Link href="/calendar" className={buttonClass("secondary", "sm")}>
            Today
          </Link>
          <Link
            href={`/calendar?month=${next}`}
            className={buttonClass("secondary", "sm")}
            aria-label="Next month"
          >
            <ChevronRight className="size-4" />
          </Link>
        </div>
      </div>

      <ul className="mb-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-2" aria-label="Legend">
        {order.map((k) => {
          const Icon = KIND[k].icon;
          return (
            <li key={k} className="flex items-center gap-1.5">
              <span
                className={cx(
                  "flex size-4 items-center justify-center rounded-sm border",
                  KIND[k].cls,
                )}
              >
                <Icon className="size-3" />
              </span>
              {KIND[k].label}
            </li>
          );
        })}
      </ul>

      {/* Month grid (tablet and up) */}
      <div className="hidden overflow-hidden rounded-lg border border-line bg-line md:block">
        <div className="grid grid-cols-7 gap-px">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div
              key={d}
              className="bg-panel-2 px-2 py-1.5 font-display text-xs font-bold tracking-widest text-ink-3 uppercase"
            >
              {d}
            </div>
          ))}
          {visible.map((d) => {
            const key = iso(d);
            const list = byDay.get(key) ?? [];
            const inMonth = d.getMonth() === m - 1;
            const isToday = key === todayIso;
            return (
              <div key={key} className={cx("min-h-28 bg-panel p-1.5", !inMonth && "bg-panel-2/60")}>
                <p
                  className={cx(
                    "mb-1 flex size-6 items-center justify-center rounded-full font-mono text-xs",
                    isToday
                      ? "bg-accent font-bold text-accent-ink"
                      : inMonth
                        ? "text-ink-2"
                        : "text-ink-3/60",
                  )}
                >
                  {d.getDate()}
                </p>
                <ul className="flex flex-col gap-0.5">
                  {list.slice(0, 3).map((e, i) => (
                    <EventChip key={i} event={e} />
                  ))}
                  {list.length > 3 && (
                    <li className="px-1 text-[11px] text-ink-3">+{list.length - 3} more</li>
                  )}
                </ul>
              </div>
            );
          })}
        </div>
      </div>

      {/* Agenda (phones, and a full list for the month) */}
      <div className="md:mt-8">
        <h3 className="mb-2 hidden font-display text-lg font-bold tracking-wide uppercase md:block">
          This month
        </h3>
        {monthEvents.length === 0 ? (
          <p className="rounded-lg border-2 border-dashed border-line-strong px-4 py-8 text-center text-sm text-ink-3">
            Nothing scheduled this month. Work orders with a due date, time-based maintenance,
            completed jobs and expenses show up here.
          </p>
        ) : (
          <ol className="flex flex-col gap-1.5">
            {monthEvents.map((e, i) => {
              const Icon = KIND[e.kind].icon;
              return (
                <li key={i}>
                  <Link
                    href={e.href}
                    className={cx(
                      "flex items-center gap-3 rounded-md border px-3 py-2 hover:brightness-95",
                      KIND[e.kind].cls,
                    )}
                  >
                    <span className="w-14 shrink-0 font-mono text-xs text-ink-3">
                      {new Date(`${e.date}T00:00:00`).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    <Icon className="size-4 shrink-0" />
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold">{e.title}</span>
                    {e.overdue && (
                      <span className="font-display text-xs font-bold tracking-wider text-danger uppercase">
                        Overdue
                      </span>
                    )}
                    <span className="hidden truncate text-xs text-ink-3 sm:inline">
                      {e.vehicle}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        )}
        <p className="mt-3 text-xs text-ink-3">
          Mileage-only maintenance can&apos;t be dated; see each vehicle&apos;s schedule for those.
        </p>
      </div>
    </>
  );
}

function EventChip({ event }: { event: CalEvent }) {
  const Icon = KIND[event.kind].icon;
  return (
    <li>
      <Link
        href={event.href}
        title={`${KIND[event.kind].label}: ${event.title} · ${event.vehicle}`}
        className={cx(
          "flex items-center gap-1 truncate rounded-sm border px-1 py-0.5 text-[11px] leading-tight hover:brightness-95",
          KIND[event.kind].cls,
          event.overdue && "border-danger text-danger",
        )}
      >
        <Icon className="size-3 shrink-0" />
        <span className="truncate">{event.title}</span>
      </Link>
    </li>
  );
}
