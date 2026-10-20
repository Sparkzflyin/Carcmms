"use client";

import { ListChecks, Pencil, Plus, Sparkles, Wrench } from "lucide-react";
import { useActionState, useState, useTransition } from "react";
import {
  Button,
  Card,
  EmptyState,
  ErrorNote,
  Field,
  Input,
  Select,
  Textarea,
} from "@/components/ui";
import type { ChecklistTemplate } from "@/lib/types";
import { DeleteButton } from "../../work-orders/[id]/controls";
import {
  addExampleTemplates,
  deleteChecklistTemplate,
  saveChecklistTemplate,
  type FormState,
} from "../actions";

const APPLIES = { all: "All vehicles", car: "Cars", motorcycle: "Motorcycles" };

export function ChecklistsView({ templates }: { templates: ChecklistTemplate[] }) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-sm text-ink-2">
          Reusable step-by-step procedures and tool lists. Attach one to a work order and tick items
          off as you go.
        </p>
        <div className="flex gap-2">
          <Button type="button" onClick={() => start(addExampleTemplates)} disabled={pending}>
            <Sparkles className="size-4" /> {pending ? "Adding…" : "Add examples"}
          </Button>
          <Button type="button" variant="primary" onClick={() => setAdding(true)} disabled={adding}>
            <Plus className="size-4" strokeWidth={3} /> New checklist
          </Button>
        </div>
      </div>
      {adding && <TemplateForm onDone={() => setAdding(false)} />}
      {templates.length === 0 && !adding ? (
        <EmptyState icon={<ListChecks className="size-8" />} title="No checklists yet">
          Write down how you do a job once (steps, tools, torque specs) and reuse it every time. Or
          start from the examples.
        </EmptyState>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {templates.map((t, i) =>
            editing === t.id ? (
              <div key={t.id} className="lg:col-span-2">
                <TemplateForm template={t} onDone={() => setEditing(null)} />
              </div>
            ) : (
              <Card key={t.id} className="rise p-4" style={{ ["--i" as string]: i }}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-display text-xs font-bold tracking-widest text-ink-3 uppercase">
                      {APPLIES[t.applies_to]}
                    </p>
                    <h3 className="font-display text-2xl leading-tight font-bold uppercase">
                      {t.name}
                    </h3>
                    {t.description && <p className="mt-1 text-sm text-ink-2">{t.description}</p>}
                  </div>
                  <div className="flex shrink-0">
                    <button
                      type="button"
                      aria-label="Edit checklist"
                      onClick={() => setEditing(t.id)}
                      className="rounded p-1 text-ink-3 hover:bg-panel-2 hover:text-ink"
                    >
                      <Pencil className="size-4" />
                    </button>
                    <DeleteButton
                      label="Delete checklist"
                      confirmText={`Delete "${t.name}"? Work orders already using it keep their items.`}
                      onDelete={() => deleteChecklistTemplate(t.id)}
                    />
                  </div>
                </div>
                {t.tools.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {t.tools.map((tool) => (
                      <span
                        key={tool}
                        className="inline-flex items-center gap-1 rounded-sm bg-panel-2 px-2 py-0.5 text-xs text-ink-2"
                      >
                        <Wrench className="size-3" /> {tool}
                      </span>
                    ))}
                  </div>
                )}
                {t.steps.length > 0 && (
                  <ol className="mt-3 space-y-1 text-sm">
                    {t.steps.map((s, n) => (
                      <li key={n} className="flex gap-2">
                        <span className="w-5 shrink-0 text-right font-mono text-xs leading-5 text-accent">
                          {n + 1}
                        </span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </Card>
            ),
          )}
        </div>
      )}
    </>
  );
}

function TemplateForm({ template, onDone }: { template?: ChecklistTemplate; onDone: () => void }) {
  const [state, action, pending] = useActionState<FormState, FormData>(async (prev, formData) => {
    const result = await saveChecklistTemplate(prev, formData);
    if (result?.ok) onDone();
    return result;
  }, undefined);

  return (
    <form
      action={action}
      className="mb-4 rounded-md border border-dashed border-accent/60 bg-accent-soft/40 p-4"
    >
      {template && <input type="hidden" name="id" value={template.id} />}
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Name *" htmlFor="t-name" className="sm:col-span-2">
          <Input
            id="t-name"
            name="name"
            required
            autoFocus
            defaultValue={template?.name}
            placeholder="Coolant flush"
          />
        </Field>
        <Field label="For" htmlFor="t-applies">
          <Select id="t-applies" name="applies_to" defaultValue={template?.applies_to ?? "all"}>
            {Object.entries(APPLIES).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Description" htmlFor="t-desc" className="sm:col-span-3">
          <Input
            id="t-desc"
            name="description"
            defaultValue={template?.description ?? ""}
            placeholder="Specs, warnings, links"
          />
        </Field>
        <Field label="Steps" htmlFor="t-steps" hint="One per line." className="sm:col-span-2">
          <Textarea
            id="t-steps"
            name="steps"
            defaultValue={template?.steps.join("\n")}
            className="min-h-48 font-mono text-sm"
            placeholder={
              "Drain old coolant\nFlush with distilled water\nRefill 50/50 mix\nBleed air from system"
            }
          />
        </Field>
        <Field label="Tools & supplies" htmlFor="t-tools" hint="One per line.">
          <Textarea
            id="t-tools"
            name="tools"
            defaultValue={template?.tools.join("\n")}
            className="min-h-48 font-mono text-sm"
            placeholder={"Drain pan\nFunnel\nPliers"}
          />
        </Field>
      </div>
      <div className="mt-3">
        <ErrorNote>{state?.error}</ErrorNote>
      </div>
      <div className="mt-3 flex gap-2">
        <Button type="submit" size="sm" variant="primary" disabled={pending}>
          {pending ? "Saving…" : template ? "Save" : "Create checklist"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
