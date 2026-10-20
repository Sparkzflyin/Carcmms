import clsx from "clsx";
import type { ComponentProps, ReactNode } from "react";
import {
  PRIORITY_LABELS,
  STATUS_LABELS,
  type WorkOrderPriority,
  type WorkOrderStatus,
} from "@/lib/types";

export { clsx as cx };

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export function buttonClass(variant: ButtonVariant = "secondary", size: "sm" | "md" = "md") {
  return clsx(
    "inline-flex items-center justify-center gap-2 rounded-md font-semibold whitespace-nowrap transition",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
    "disabled:pointer-events-none disabled:opacity-50",
    size === "sm" ? "h-8 px-3 text-sm" : "h-10 px-4 text-[15px]",
    variant === "primary" &&
      "bg-accent text-accent-ink shadow-[inset_0_-2px_0_rgb(0_0_0/0.18)] hover:brightness-110 active:translate-y-px",
    variant === "secondary" &&
      "border border-line-strong bg-panel text-ink hover:border-ink-3 hover:bg-panel-2",
    variant === "ghost" && "text-ink-2 hover:bg-panel-2 hover:text-ink",
    variant === "danger" &&
      "border border-danger/40 bg-danger-soft text-danger hover:border-danger",
  );
}

export function Button({
  variant,
  size,
  className,
  ...props
}: ComponentProps<"button"> & { variant?: ButtonVariant; size?: "sm" | "md" }) {
  return <button className={clsx(buttonClass(variant, size), className)} {...props} />;
}

export const controlClass = clsx(
  "w-full rounded-md border border-line-strong bg-panel px-3 py-2 text-[15px] text-ink",
  "placeholder:text-ink-3 transition",
  "focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25",
  "disabled:opacity-60",
);

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={clsx(controlClass, "h-10", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={clsx(controlClass, "min-h-24", className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={clsx(controlClass, "h-10 pr-8", className)} {...props} />;
}

export function Field({
  label,
  hint,
  htmlFor,
  className,
  children,
}: {
  label: string;
  hint?: ReactNode;
  htmlFor?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={clsx("flex flex-col gap-1.5", className)}>
      <label
        htmlFor={htmlFor}
        className="font-display text-[13px] font-semibold tracking-[0.08em] text-ink-2 uppercase"
      >
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-ink-3">{hint}</p>}
    </div>
  );
}

export function Card({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={clsx("rounded-lg border border-line bg-panel shadow-card", className)}
      {...props}
    />
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-4 border-b border-line pb-2">
      <h2 className="font-display text-lg font-bold tracking-wide uppercase">{children}</h2>
      {action}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1 font-mono text-xs tracking-wider text-ink-3 uppercase">{eyebrow}</p>
        )}
        <h1 className="font-display text-4xl leading-none font-extrabold tracking-tight uppercase sm:text-5xl">
          {title}
        </h1>
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </header>
  );
}

const STATUS_STYLES: Record<WorkOrderStatus, string> = {
  open: "bg-info-soft text-info border-info/30",
  in_progress: "bg-accent-soft text-accent border-accent/30",
  waiting_parts: "bg-warn-soft text-warn border-warn/30",
  done: "bg-ok-soft text-ok border-ok/30",
  cancelled: "bg-panel-2 text-ink-3 border-line",
};

export function StatusBadge({ status }: { status: WorkOrderStatus }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 font-display text-xs font-bold tracking-wider uppercase",
        STATUS_STYLES[status],
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {STATUS_LABELS[status]}
    </span>
  );
}

const PRIORITY_STYLES: Record<WorkOrderPriority, string> = {
  low: "text-ink-3",
  medium: "text-ink-2",
  high: "text-warn",
  critical: "text-danger",
};

export function PriorityBadge({ priority }: { priority: WorkOrderPriority }) {
  const bars = { low: 1, medium: 2, high: 3, critical: 4 }[priority];
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 font-display text-xs font-bold tracking-wider uppercase",
        PRIORITY_STYLES[priority],
      )}
      title={`${PRIORITY_LABELS[priority]} priority`}
    >
      <span className="flex items-end gap-px" aria-hidden>
        {[1, 2, 3, 4].map((n) => (
          <span
            key={n}
            className={clsx("w-[3px] rounded-[1px]", n <= bars ? "bg-current" : "bg-line")}
            style={{ height: 3 + n * 2 }}
          />
        ))}
      </span>
      {PRIORITY_LABELS[priority]}
    </span>
  );
}

export function EmptyState({
  icon,
  title,
  children,
}: {
  icon?: ReactNode;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-lg border-2 border-dashed border-line-strong px-6 py-14 text-center">
      {icon && <div className="mb-3 text-ink-3">{icon}</div>}
      <p className="font-display text-xl font-bold tracking-wide uppercase">{title}</p>
      {children && <div className="mt-2 max-w-md text-sm text-ink-2">{children}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx("animate-pulse rounded-md bg-panel-2", className)} />;
}

export function ErrorNote({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="rounded-md border border-danger/40 bg-danger-soft px-3 py-2 text-sm text-danger">
      {children}
    </p>
  );
}
