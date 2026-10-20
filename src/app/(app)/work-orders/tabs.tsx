import Link from "next/link";
import { cx } from "@/components/ui";

export const TABS = [
  { key: "open", label: "All open", href: "/work-orders" },
  { key: "in_progress", label: "In progress", href: "/work-orders?filter=in_progress" },
  { key: "waiting_parts", label: "Waiting on parts", href: "/work-orders?filter=waiting_parts" },
  { key: "closed", label: "Closed", href: "/work-orders?filter=closed" },
  { key: "archived", label: "Archived", href: "/work-orders/archive" },
] as const;

export type TabKey = (typeof TABS)[number]["key"];

export function WorkOrderTabs({ active }: { active: TabKey }) {
  return (
    <nav className="flex flex-wrap gap-2" aria-label="Filter work orders">
      {TABS.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          aria-current={t.key === active ? "page" : undefined}
          className={cx(
            "rounded-full border px-3.5 py-1 font-display text-sm font-bold tracking-wider uppercase transition",
            t.key === active
              ? "border-ink bg-ink text-bg"
              : "border-line-strong text-ink-2 hover:border-ink-3 hover:text-ink",
            t.key === "archived" && t.key !== active && "border-dashed",
          )}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
