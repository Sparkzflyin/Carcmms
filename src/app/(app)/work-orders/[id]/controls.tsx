"use client";

import { Archive, ArchiveRestore, ImagePlus, Pencil, Plus, Trash2, X } from "lucide-react";
import { useActionState, useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { Button, ErrorNote, Field, Input, Select, Textarea, cx } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import {
  PART_STATUS_LABELS,
  PRIORITY_LABELS,
  STATUS_LABELS,
  type PartStatus,
  type WorkOrder,
  type WorkOrderStatus,
} from "@/lib/types";
import {
  addNote,
  addPart,
  archiveClosedWorkOrders,
  archiveWorkOrder,
  deleteNote,
  deletePart,
  deleteWorkOrder,
  setPartStatus,
  restoreWorkOrder,
  setWorkOrderStatus,
  updateWorkOrder,
  type FormState,
} from "../actions";

const FLOW: WorkOrderStatus[] = ["open", "in_progress", "waiting_parts", "done"];

export function StatusStepper({ id, status }: { id: string; status: WorkOrderStatus }) {
  const [pending, start] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(status);

  const change = (next: WorkOrderStatus) => {
    if (next === optimistic) return;
    start(async () => {
      setOptimistic(next);
      await setWorkOrderStatus(id, next);
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-1 rounded-lg border border-line bg-panel-2 p-1 sm:grid-cols-4" role="radiogroup" aria-label="Status">
        {FLOW.map((s) => (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={optimistic === s}
            disabled={pending}
            onClick={() => change(s)}
            className={cx(
              "rounded-md px-3 py-2 font-display text-sm font-bold tracking-wider uppercase transition",
              optimistic === s
                ? s === "done"
                  ? "bg-ok text-white shadow"
                  : "bg-accent text-accent-ink shadow"
                : "text-ink-2 hover:bg-panel hover:text-ink",
            )}
          >
            {STATUS_LABELS[s]}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => change(optimistic === "cancelled" ? "open" : "cancelled")}
        className="self-end text-xs text-ink-3 hover:text-ink hover:underline"
      >
        {optimistic === "cancelled" ? "Cancelled · Reopen" : "Cancel this work order"}
      </button>
    </div>
  );
}

export function EditDetails({ order }: { order: WorkOrder }) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState<FormState, FormData>(async (prev, formData) => {
    const result = await updateWorkOrder(prev, formData);
    if (result?.ok) setEditing(false);
    return result;
  }, undefined);

  if (!editing) {
    return (
      <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(true)}>
        <Pencil className="size-4" /> Edit details
      </Button>
    );
  }

  return (
    <form action={action} className="mt-2 flex w-full flex-col gap-4 rounded-md border border-accent/60 bg-panel-2 p-4">
      <input type="hidden" name="id" value={order.id} />
      <Field label="Title" htmlFor="e-title">
        <Input id="e-title" name="title" defaultValue={order.title} required />
      </Field>
      <Field label="Details" htmlFor="e-desc">
        <Textarea id="e-desc" name="description" defaultValue={order.description ?? ""} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Priority" htmlFor="e-priority">
          <Select id="e-priority" name="priority" defaultValue={order.priority}>
            {Object.entries(PRIORITY_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </Select>
        </Field>
        <Field label="Odometer" htmlFor="e-odo">
          <Input id="e-odo" name="odometer" inputMode="numeric" defaultValue={order.odometer ?? ""} className="font-mono" />
        </Field>
        <Field label="Due by" htmlFor="e-due">
          <Input id="e-due" name="due_date" type="date" defaultValue={order.due_date ?? ""} />
        </Field>
        <Field label="Labor hours" htmlFor="e-hours">
          <Input id="e-hours" name="labor_hours" inputMode="decimal" defaultValue={order.labor_hours || ""} placeholder="0" />
        </Field>
        <Field label="Labor rate ($/hr)" htmlFor="e-rate" hint="0 if you're doing it yourself.">
          <Input id="e-rate" name="labor_rate" inputMode="decimal" defaultValue={order.labor_rate || ""} placeholder="0" />
        </Field>
      </div>
      <ErrorNote>{state?.error}</ErrorNote>
      <div className="flex gap-2">
        <Button type="submit" size="sm" variant="primary" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export function AddPartForm({ workOrderId }: { workOrderId: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<FormState, FormData>(addPart, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  if (!open) {
    return (
      <Button type="button" size="sm" onClick={() => setOpen(true)}>
        <Plus className="size-4" /> Add part
      </Button>
    );
  }

  return (
    <form ref={formRef} action={action} className="mt-3 rounded-md border border-dashed border-accent/60 bg-accent-soft/40 p-4">
      <input type="hidden" name="work_order_id" value={workOrderId} />
      <div className="grid gap-3 sm:grid-cols-6">
        <Field label="Part *" htmlFor="p-name" className="sm:col-span-3">
          <Input id="p-name" name="name" required autoFocus placeholder="Front brake pads" />
        </Field>
        <Field label="Part #" htmlFor="p-num" className="sm:col-span-3">
          <Input id="p-num" name="part_number" className="font-mono" placeholder="D1210" />
        </Field>
        <Field label="Vendor" htmlFor="p-vendor" className="sm:col-span-2">
          <Input id="p-vendor" name="vendor" placeholder="RockAuto" />
        </Field>
        <Field label="Qty" htmlFor="p-qty">
          <Input id="p-qty" name="quantity" inputMode="decimal" defaultValue="1" />
        </Field>
        <Field label="Unit $" htmlFor="p-cost">
          <Input id="p-cost" name="unit_cost" inputMode="decimal" placeholder="0.00" />
        </Field>
        <Field label="Status" htmlFor="p-status" className="sm:col-span-2">
          <Select id="p-status" name="status" defaultValue="needed">
            {Object.entries(PART_STATUS_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="mt-3">
        <ErrorNote>{state?.error}</ErrorNote>
      </div>
      <div className="mt-3 flex gap-2">
        <Button type="submit" size="sm" variant="primary" disabled={pending}>
          {pending ? "Adding…" : "Add part"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Done
        </Button>
      </div>
    </form>
  );
}

const PART_STYLES: Record<PartStatus, string> = {
  needed: "text-danger",
  ordered: "text-warn",
  received: "text-info",
  installed: "text-ok",
};

export function PartStatusSelect({ id, status }: { id: string; status: PartStatus }) {
  const [pending, start] = useTransition();
  return (
    <select
      aria-label="Part status"
      value={status}
      disabled={pending}
      onChange={(e) => start(() => setPartStatus(id, e.target.value as PartStatus))}
      className={cx(
        "cursor-pointer rounded border border-transparent bg-transparent py-0.5 font-display text-xs font-bold tracking-wider uppercase hover:border-line-strong",
        PART_STYLES[status],
      )}
    >
      {Object.entries(PART_STATUS_LABELS).map(([v, l]) => (
        <option key={v} value={v}>{l}</option>
      ))}
    </select>
  );
}

export function DeleteButton({
  label,
  confirmText,
  onDelete,
}: {
  label: string;
  confirmText: string;
  onDelete: () => Promise<void>;
}) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={pending}
      onClick={() => {
        if (confirm(confirmText)) start(onDelete);
      }}
      className="rounded p-1 text-ink-3 hover:bg-danger-soft hover:text-danger disabled:opacity-40"
    >
      <Trash2 className="size-4" />
    </button>
  );
}

export function DeletePartButton({ id }: { id: string }) {
  return <DeleteButton label="Remove part" confirmText="Remove this part?" onDelete={() => deletePart(id)} />;
}

export function DeleteNoteButton({ id }: { id: string }) {
  return <DeleteButton label="Delete note" confirmText="Delete this note?" onDelete={() => deleteNote(id)} />;
}

export function DeleteWorkOrderButton({ id, vehicleId }: { id: string; vehicleId: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      variant="danger"
      size="sm"
      disabled={pending}
      className="w-full"
      onClick={() => {
        if (confirm("Delete this work order, its parts and notes? This can't be undone.")) {
          start(() => deleteWorkOrder(id, vehicleId));
        }
      }}
    >
      <Trash2 className="size-4" /> Delete work order
    </Button>
  );
}

export function AddNoteForm({ workOrderId, userId }: { workOrderId: string; userId: string }) {
  const [files, setFiles] = useState<{ file: File; preview: string }[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const [state, action, pending] = useActionState<FormState, FormData>(async (prev, formData) => {
    const supabase = createClient();
    for (const { file } of files) {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${userId}/work-orders/${workOrderId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("photos").upload(path, file, { contentType: file.type });
      if (error) return { error: `Photo upload failed: ${error.message}` };
      formData.append("photo_path", path);
    }
    const result = await addNote(prev, formData);
    if (result?.ok) {
      setFiles([]);
      formRef.current?.reset();
    }
    return result;
  }, undefined);

  return (
    <form ref={formRef} action={action} className="rounded-lg border border-line bg-panel p-3 shadow-card">
      <input type="hidden" name="work_order_id" value={workOrderId} />
      <Textarea
        name="body"
        placeholder="Add an update: what you found, what you did, torque specs…"
        className="min-h-20 border-0 bg-transparent px-1 focus:ring-0"
        aria-label="Note"
      />
      {files.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {files.map((f, i) => (
            <div key={f.preview} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={f.preview} alt="" className="size-20 rounded-md object-cover" />
              <button
                type="button"
                aria-label="Remove photo"
                onClick={() => setFiles((fs) => fs.filter((_, j) => j !== i))}
                className="absolute -top-1.5 -right-1.5 rounded-full bg-ink p-0.5 text-bg"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
      <input
        ref={fileInput}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        className="hidden"
        onChange={(e) => {
          const picked = Array.from(e.target.files ?? []).filter((f) => f.size <= 10 * 1024 * 1024);
          setFiles((fs) => [...fs, ...picked.map((file) => ({ file, preview: URL.createObjectURL(file) }))].slice(0, 8));
          e.target.value = "";
        }}
      />
      <div className="mt-2 flex items-center justify-between gap-2 border-t border-line pt-2">
        <Button type="button" size="sm" variant="ghost" onClick={() => fileInput.current?.click()}>
          <ImagePlus className="size-4" /> Photos
        </Button>
        <div className="flex items-center gap-3">
          {state?.error && <span className="text-sm text-danger">{state.error}</span>}
          <Button type="submit" size="sm" variant="primary" disabled={pending}>
            {pending ? "Posting…" : "Post update"}
          </Button>
        </div>
      </div>
    </form>
  );
}

export function ArchiveButton({
  id,
  archived,
  variant = "secondary",
}: {
  id: string;
  archived: boolean;
  variant?: "secondary" | "primary";
}) {
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      size="sm"
      variant={variant}
      disabled={pending}
      className="w-full"
      onClick={() => start(() => (archived ? restoreWorkOrder(id) : archiveWorkOrder(id)))}
    >
      {archived ? <ArchiveRestore className="size-4" /> : <Archive className="size-4" />}
      {pending ? "…" : archived ? "Restore from archive" : "Archive"}
    </Button>
  );
}

export function ArchiveAllClosedButton({ vehicleId, count }: { vehicleId?: string; count: number }) {
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      size="sm"
      disabled={pending || count === 0}
      onClick={() => {
        if (confirm(`Archive ${count} closed work order${count === 1 ? "" : "s"}? You can restore them any time.`)) {
          start(() => archiveClosedWorkOrders(vehicleId));
        }
      }}
    >
      <Archive className="size-4" /> {pending ? "Archiving…" : "Archive all closed"}
    </Button>
  );
}
