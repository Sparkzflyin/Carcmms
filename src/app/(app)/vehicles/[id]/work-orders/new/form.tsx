"use client";

import { useActionState } from "react";
import { Button, Card, ErrorNote, Field, Input, Select, Textarea } from "@/components/ui";
import { unitLabel } from "@/lib/format";
import { PRIORITY_LABELS, type Vehicle } from "@/lib/types";
import { createWorkOrder, type FormState } from "../../../../work-orders/actions";

const QUICK_TITLES = [
  "Oil change",
  "Brake pads",
  "Tire rotation",
  "Check engine light",
  "Battery",
  "Chain & sprockets",
];

export function NewWorkOrderForm({
  vehicle,
  defaults,
}: {
  vehicle: Pick<Vehicle, "id" | "odometer" | "odometer_unit">;
  defaults: { title: string; description: string; priority: string };
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(createWorkOrder, undefined);

  return (
    <form action={action} className="max-w-3xl">
      <input type="hidden" name="vehicle_id" value={vehicle.id} />
      <Card className="flex flex-col gap-5 p-5 sm:p-6">
        <Field label="What needs doing? *" htmlFor="title">
          <Input
            id="title"
            name="title"
            required
            autoFocus
            defaultValue={defaults.title}
            placeholder="Replace front brake pads"
            list="quick-titles"
          />
          <datalist id="quick-titles">
            {QUICK_TITLES.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </Field>
        <Field label="Details" htmlFor="description">
          <Textarea
            id="description"
            name="description"
            defaultValue={defaults.description}
            placeholder="Symptoms, what you've checked, the plan…"
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Priority" htmlFor="priority">
            <Select
              id="priority"
              name="priority"
              defaultValue={defaults.priority in PRIORITY_LABELS ? defaults.priority : "medium"}
            >
              {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Status" htmlFor="status">
            <Select id="status" name="status" defaultValue="open">
              <option value="open">Open</option>
              <option value="in_progress">In progress</option>
              <option value="waiting_parts">Waiting on parts</option>
            </Select>
          </Field>
          <Field label={`Odometer (${unitLabel(vehicle.odometer_unit)})`} htmlFor="odometer">
            <Input
              id="odometer"
              name="odometer"
              inputMode="numeric"
              defaultValue={vehicle.odometer}
              className="font-mono"
            />
          </Field>
          <Field label="Due by" htmlFor="due_date">
            <Input id="due_date" name="due_date" type="date" />
          </Field>
        </div>
        <ErrorNote>{state?.error}</ErrorNote>
        <div className="flex justify-end">
          <Button type="submit" variant="primary" disabled={pending}>
            {pending ? "Creating…" : "Create work order"}
          </Button>
        </div>
      </Card>
      <p className="mt-3 text-sm text-ink-3">
        You can add parts, costs, notes and photos once it&apos;s created.
      </p>
    </form>
  );
}
