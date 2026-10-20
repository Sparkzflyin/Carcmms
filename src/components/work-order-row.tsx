import { CalendarClock, ChevronRight } from "lucide-react";
import Link from "next/link";
import { formatDate, workOrderNumber } from "@/lib/format";
import type { WorkOrder } from "@/lib/types";
import { LocalTime } from "./local-time";
import { PriorityBadge, StatusBadge, cx } from "./ui";

// A work order as a shop tag: punched hole, number stub, then the details.
export function WorkOrderRow({
  order,
  vehicleLabel,
  index = 0,
}: {
  order: WorkOrder;
  vehicleLabel?: string;
  index?: number;
}) {
  const closed = order.status === "done" || order.status === "cancelled";
  return (
    <Link
      href={`/work-orders/${order.id}`}
      className={cx(
        "rise group relative flex items-stretch overflow-hidden rounded-md border border-line bg-panel shadow-card transition",
        "hover:border-line-strong focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none",
        closed && "opacity-70",
      )}
      style={{ ["--i" as string]: index }}
    >
      {order.priority === "critical" && !closed && <div className="hazard w-1.5 shrink-0" />}
      <div className="flex w-20 shrink-0 flex-col items-center justify-center gap-1.5 border-r border-dashed border-line-strong bg-panel-2 px-2 py-3">
        <span className="size-2.5 rounded-full border border-line-strong bg-bg" aria-hidden />
        <span className="font-mono text-[11px] font-bold text-ink-2">{workOrderNumber(order.number)}</span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 px-4 py-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <StatusBadge status={order.status} />
          <PriorityBadge priority={order.priority} />
          {order.maintenance_schedule_id && (
            <span className="inline-flex items-center gap-1 text-xs text-ink-3">
              <CalendarClock className="size-3" /> Scheduled
            </span>
          )}
        </div>
        <p className="truncate font-semibold">{order.title}</p>
        <p className="truncate text-xs text-ink-3">
          {vehicleLabel && <span className="font-semibold text-ink-2">{vehicleLabel} · </span>}
          {closed && order.completed_at ? (
            <>Closed <LocalTime iso={order.completed_at} /></>
          ) : order.due_date ? (
            `Due ${formatDate(order.due_date)}`
          ) : (
            <>Opened <LocalTime iso={order.created_at} /></>
          )}
        </p>
      </div>
      <ChevronRight className="mr-3 size-5 self-center text-ink-3 transition group-hover:translate-x-0.5 group-hover:text-ink" />
    </Link>
  );
}
