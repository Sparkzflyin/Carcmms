"use client";

import { Check, Gauge, Plus, Trash2 } from "lucide-react";
import { useActionState, useState, useTransition } from "react";
import { Button, ErrorNote, Field, Input } from "@/components/ui";
import type { OdometerUnit } from "@/lib/types";
import { unitLabel } from "@/lib/format";
import {
  addSchedule,
  deleteSchedule,
  logScheduleDone,
  updateOdometer,
  type FormState,
} from "../../work-orders/actions";

export function OdometerForm({
  vehicleId,
  odometer,
  unit,
}: {
  vehicleId: string;
  odometer: number;
  unit: OdometerUnit;
}) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState<FormState, FormData>(async (prev, formData) => {
    const result = await updateOdometer(prev, formData);
    if (result?.ok) setEditing(false);
    return result;
  }, undefined);


  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="group flex w-full items-center justify-between gap-3 rounded-md border border-line bg-panel-2 px-4 py-3 text-left hover:border-accent"
      >
        <span>
          <span className="block font-display text-xs font-semibold tracking-widest text-ink-3 uppercase">
            Odometer
          </span>
          <span className="font-mono text-2xl font-bold">
            {odometer.toLocaleString("en-US")}{" "}
            <span className="text-base text-ink-3">{unitLabel(unit)}</span>
          </span>
        </span>
        <span className="flex items-center gap-1 text-sm font-semibold text-accent opacity-80 group-hover:opacity-100">
          <Gauge className="size-4" /> Update
        </span>
      </button>
    );
  }

  return (
    <form action={action} className="rounded-md border border-accent bg-panel-2 p-3">
      <input type="hidden" name="vehicle_id" value={vehicleId} />
      <label htmlFor="odo" className="font-display text-xs font-semibold tracking-widest text-ink-3 uppercase">
        New reading ({unitLabel(unit)})
      </label>
      <div className="mt-1 flex gap-2">
        <Input id="odo" name="odometer" inputMode="numeric" defaultValue={odometer} autoFocus className="font-mono" />
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? "…" : "Save"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
          Cancel
        </Button>
      </div>
      {state?.error && <p className="mt-2 text-sm text-danger">{state.error}</p>}
    </form>
  );
}

export function ScheduleActions({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex shrink-0 gap-1">
      <Button
        type="button"
        size="sm"
        disabled={pending}
        onClick={() => start(() => logScheduleDone(id))}
        title="Record this service as done today"
      >
        <Check className="size-4" /> Done
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={pending}
        aria-label="Delete schedule"
        onClick={() => {
          if (confirm("Delete this maintenance schedule?")) start(() => deleteSchedule(id));
        }}
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}

export function ScheduleForm({
  vehicleId,
  unit,
  odometer,
}: {
  vehicleId: string;
  unit: OdometerUnit;
  odometer: number;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<FormState, FormData>(async (prev, formData) => {
    const result = await addSchedule(prev, formData);
    if (result?.ok) setOpen(false);
    return result;
  }, undefined);


  if (!open) {
    return (
      <Button type="button" size="sm" onClick={() => setOpen(true)}>
        <Plus className="size-4" /> Add schedule
      </Button>
    );
  }

  return (
    <form action={action} className="rounded-md border border-dashed border-accent/60 bg-accent-soft/40 p-4">
      <input type="hidden" name="vehicle_id" value={vehicleId} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Service" htmlFor="s-title" className="sm:col-span-2">
          <Input id="s-title" name="title" placeholder="Oil & filter change" required autoFocus />
        </Field>
        <Field label={`Every (${unitLabel(unit)})`} htmlFor="s-dist">
          <Input id="s-dist" name="interval_distance" inputMode="numeric" placeholder="5,000" />
        </Field>
        <Field label="And/or every (months)" htmlFor="s-months">
          <Input id="s-months" name="interval_months" inputMode="numeric" placeholder="6" />
        </Field>
        <Field label={`Last done at (${unitLabel(unit)})`} htmlFor="s-last-odo" hint="Leave blank if never.">
          <Input id="s-last-odo" name="last_done_odometer" inputMode="numeric" placeholder={odometer.toLocaleString("en-US")} />
        </Field>
        <Field label="Last done on" htmlFor="s-last-date" hint="Leave blank to start counting today.">
          <Input id="s-last-date" name="last_done_date" type="date" />
        </Field>
      </div>
      <div className="mt-3">
        <ErrorNote>{state?.error}</ErrorNote>
      </div>
      <div className="mt-3 flex gap-2">
        <Button type="submit" size="sm" variant="primary" disabled={pending}>
          {pending ? "Adding…" : "Add schedule"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
