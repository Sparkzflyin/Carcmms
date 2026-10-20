"use client";

import { ListPlus } from "lucide-react";
import { useState, useTransition } from "react";
import { Button, Card, Input, cx } from "@/components/ui";
import { unitLabel } from "@/lib/format";
import type { StarterSchedule } from "@/lib/starter-schedules";
import type { OdometerUnit } from "@/lib/types";
import { addStarterSchedules } from "../../work-orders/actions";

type Row = StarterSchedule & { on: boolean; exists: boolean };

export function StarterSchedules({
  vehicleId,
  unit,
  starters,
  existingTitles,
  startOpen,
}: {
  vehicleId: string;
  unit: OdometerUnit;
  starters: StarterSchedule[];
  existingTitles: string[];
  startOpen: boolean;
}) {
  const [open, setOpen] = useState(startOpen);
  const existing = new Set(existingTitles.map((t) => t.toLowerCase()));
  const [rows, setRows] = useState<Row[]>(() =>
    starters.map((s) => {
      const exists = existing.has(s.title.toLowerCase());
      return { ...s, exists, on: s.defaultOn && !exists };
    }),
  );
  const [pending, start] = useTransition();
  const chosen = rows.filter((r) => r.on);

  if (!open) {
    return (
      <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(true)}>
        <ListPlus className="size-4" /> Common schedules
      </Button>
    );
  }

  const update = (key: string, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const num = (v: string) => (v.trim() === "" ? null : Number(v.replace(/,/g, "")) || null);

  return (
    <Card className="mb-4 overflow-hidden border-accent/50">
      <div className="border-b border-line bg-accent-soft/50 px-4 py-3">
        <p className="font-display text-lg font-bold tracking-wide uppercase">
          Recommended maintenance
        </p>
        <p className="text-sm text-ink-2">
          Common intervals for this kind of vehicle. Adjust them to match your owner&apos;s manual.
          They start counting from today.
        </p>
      </div>
      <ul className="divide-y divide-line">
        {rows.map((r) => (
          <li
            key={r.key}
            className={cx(
              "flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5",
              r.exists && "opacity-50",
            )}
          >
            <label className="flex min-w-48 flex-1 cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={r.on}
                disabled={r.exists}
                onChange={(e) => update(r.key, { on: e.target.checked })}
                className="mt-1 size-4 accent-[var(--accent)]"
              />
              <span>
                <span className="font-semibold">{r.title}</span>
                {r.exists && <span className="ml-2 text-xs text-ink-3">(already added)</span>}
                {r.note && <span className="block text-xs text-ink-3">{r.note}</span>}
              </span>
            </label>
            <div className="flex items-center gap-2 text-sm text-ink-3">
              every
              <Input
                aria-label={`${r.title} distance interval`}
                value={r.distance ?? ""}
                onChange={(e) => update(r.key, { distance: num(e.target.value) })}
                disabled={!r.on}
                inputMode="numeric"
                placeholder="—"
                className="h-8 w-24 px-2 text-right font-mono text-sm"
              />
              {unitLabel(unit)}
              <Input
                aria-label={`${r.title} months interval`}
                value={r.months ?? ""}
                onChange={(e) => update(r.key, { months: num(e.target.value) })}
                disabled={!r.on}
                inputMode="numeric"
                placeholder="—"
                className="h-8 w-14 px-2 text-right font-mono text-sm"
              />
              mo
            </div>
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-end gap-2 border-t border-line px-4 py-3">
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Not now
        </Button>
        <Button
          type="button"
          size="sm"
          variant="primary"
          disabled={pending || chosen.length === 0}
          onClick={() =>
            start(async () => {
              await addStarterSchedules(
                vehicleId,
                chosen.map((r) => ({ title: r.title, distance: r.distance, months: r.months })),
              );
              setOpen(false);
            })
          }
        >
          {pending ? "Adding…" : `Add ${chosen.length} schedule${chosen.length === 1 ? "" : "s"}`}
        </Button>
      </div>
    </Card>
  );
}
