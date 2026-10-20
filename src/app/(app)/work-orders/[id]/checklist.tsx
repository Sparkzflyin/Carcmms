"use client";

import { Check, ListChecks, Plus, Wrench, X } from "lucide-react";
import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import { Button, Input, Select, cx } from "@/components/ui";
import type { ChecklistItem, ChecklistTemplate } from "@/lib/types";
import {
  addChecklistItem,
  applyChecklistTemplate,
  deleteChecklistItem,
  toggleChecklistItem,
} from "../../shop/actions";

export function WorkOrderChecklist({
  workOrderId,
  items,
  templates,
}: {
  workOrderId: string;
  items: ChecklistItem[];
  templates: Pick<ChecklistTemplate, "id" | "name">[];
}) {
  const [optimisticItems, setDone] = useOptimistic(
    items,
    (state, { id, done }: { id: string; done: boolean }) =>
      state.map((i) => (i.id === id ? { ...i, done } : i)),
  );
  const [pending, start] = useTransition();
  const [template, setTemplate] = useState("");

  const tools = optimisticItems.filter((i) => i.kind === "tool");
  const steps = optimisticItems.filter((i) => i.kind === "step");
  const done = optimisticItems.filter((i) => i.done).length;
  const pct = optimisticItems.length ? Math.round((done / optimisticItems.length) * 100) : 0;

  const toggle = (item: ChecklistItem) =>
    start(async () => {
      setDone({ id: item.id, done: !item.done });
      await toggleChecklistItem(item.id, !item.done);
    });

  return (
    <div className="flex flex-col gap-4">
      {optimisticItems.length > 0 && (
        <div className="flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-panel-2">
            <div className="h-full bg-ok transition-all" style={{ width: `${pct}%` }} />
          </div>
          <span className="font-mono text-xs text-ink-3">
            {done}/{optimisticItems.length}
          </span>
        </div>
      )}

      {tools.length > 0 && (
        <div>
          <p className="mb-2 font-display text-xs font-bold tracking-widest text-ink-3 uppercase">
            Tools & supplies
          </p>
          <div className="flex flex-wrap gap-2">
            {tools.map((t) => (
              <span
                key={t.id}
                className={cx(
                  "group inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-sm transition",
                  t.done ? "border-ok/40 bg-ok-soft text-ok" : "border-line-strong bg-panel",
                )}
              >
                <button
                  type="button"
                  onClick={() => toggle(t)}
                  className="inline-flex items-center gap-1.5"
                  aria-pressed={t.done}
                >
                  {t.done ? (
                    <Check className="size-3.5" />
                  ) : (
                    <Wrench className="size-3.5 text-ink-3" />
                  )}
                  <span className={cx(t.done && "line-through decoration-ok/50")}>{t.text}</span>
                </button>
                <RemoveButton id={t.id} />
              </span>
            ))}
          </div>
        </div>
      )}

      {steps.length > 0 && (
        <ol className="flex flex-col">
          {steps.map((s, n) => (
            <li
              key={s.id}
              className="group flex items-start gap-3 border-b border-line py-2 last:border-0"
            >
              <button
                type="button"
                role="checkbox"
                aria-checked={s.done}
                aria-label={s.text}
                onClick={() => toggle(s)}
                className={cx(
                  "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border-2 transition",
                  s.done ? "border-ok bg-ok text-white" : "border-line-strong hover:border-accent",
                )}
              >
                {s.done && <Check className="size-3.5" strokeWidth={3} />}
              </button>
              <span className="w-5 shrink-0 text-right font-mono text-xs leading-6 text-ink-3">
                {n + 1}
              </span>
              <span className={cx("flex-1", s.done && "text-ink-3 line-through")}>{s.text}</span>
              <RemoveButton id={s.id} />
            </li>
          ))}
        </ol>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {templates.length > 0 ? (
          <>
            <Select
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              className="h-8 w-auto min-w-48 text-sm"
              aria-label="Checklist template"
            >
              <option value="">Use a saved checklist…</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
            <Button
              type="button"
              size="sm"
              disabled={!template || pending}
              onClick={() =>
                start(async () => {
                  await applyChecklistTemplate(workOrderId, template);
                  setTemplate("");
                })
              }
            >
              <ListChecks className="size-4" /> Add
            </Button>
          </>
        ) : (
          <Link
            href="/shop/checklists"
            className="text-sm font-semibold text-accent hover:underline"
          >
            Create reusable checklists in the Shop →
          </Link>
        )}
      </div>
      <QuickAdd workOrderId={workOrderId} />
    </div>
  );
}

function RemoveButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      aria-label="Remove item"
      disabled={pending}
      onClick={() => start(() => deleteChecklistItem(id))}
      className="rounded p-0.5 text-ink-3 opacity-0 group-hover:opacity-100 hover:text-danger focus:opacity-100"
    >
      <X className="size-3.5" />
    </button>
  );
}

function QuickAdd({ workOrderId }: { workOrderId: string }) {
  const [value, setValue] = useState("");
  const [kind, setKind] = useState<"step" | "tool">("step");
  const [pending, start] = useTransition();
  const submit = () => {
    if (!value.trim()) return;
    start(async () => {
      await addChecklistItem(workOrderId, kind, value);
      setValue("");
    });
  };
  return (
    <div className="flex gap-2">
      <Select
        value={kind}
        onChange={(e) => setKind(e.target.value as "step" | "tool")}
        className="h-9 w-24 shrink-0 text-sm"
        aria-label="Item type"
      >
        <option value="step">Step</option>
        <option value="tool">Tool</option>
      </Select>
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          }
        }}
        placeholder={kind === "step" ? "Add a step…" : "Add a tool or supply…"}
        className="h-9 text-sm"
        aria-label="New checklist item"
      />
      <Button
        type="button"
        size="sm"
        onClick={submit}
        disabled={pending || !value.trim()}
        className="h-9"
        aria-label="Add item"
      >
        <Plus className="size-4" />
      </Button>
    </div>
  );
}
