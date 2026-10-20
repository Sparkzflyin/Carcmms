"use client";

import { ExternalLink, MapPin, Pencil, Phone, Plus, Store } from "lucide-react";
import { useActionState, useState } from "react";
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
import { formatMoney } from "@/lib/format";
import { VENDOR_KIND_LABELS, type Vendor } from "@/lib/types";
import { DeleteButton } from "../../work-orders/[id]/controls";
import { deleteVendor, saveVendor, type FormState } from "../actions";

type Stats = Record<string, { spent: number; parts: number; stocked: number }>;

export function VendorsView({ vendors, stats }: { vendors: Vendor[]; stats: Stats }) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-4">
        <p className="text-sm text-ink-2">
          Where you buy parts and get work done. Type a saved vendor&apos;s name on a part or
          inventory item to link it.
        </p>
        <Button
          type="button"
          variant="primary"
          onClick={() => setAdding(true)}
          disabled={adding}
          className="shrink-0"
        >
          <Plus className="size-4" strokeWidth={3} /> Add vendor
        </Button>
      </div>
      {adding && <VendorForm onDone={() => setAdding(false)} />}
      {vendors.length === 0 && !adding ? (
        <EmptyState icon={<Store className="size-8" />} title="No vendors yet">
          Save your go-to parts stores, online shops and mechanics so their links and numbers are a
          click away.
        </EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {vendors.map((v, i) =>
            editing === v.id ? (
              <div key={v.id} className="sm:col-span-2 lg:col-span-3">
                <VendorForm vendor={v} onDone={() => setEditing(null)} />
              </div>
            ) : (
              <Card key={v.id} className="rise flex flex-col p-4" style={{ ["--i" as string]: i }}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-display text-xs font-bold tracking-widest text-ink-3 uppercase">
                      {VENDOR_KIND_LABELS[v.kind]}
                    </p>
                    <h3 className="font-display text-2xl leading-tight font-bold uppercase">
                      {v.name}
                    </h3>
                  </div>
                  <div className="flex">
                    <button
                      type="button"
                      aria-label="Edit vendor"
                      onClick={() => setEditing(v.id)}
                      className="rounded p-1 text-ink-3 hover:bg-panel-2 hover:text-ink"
                    >
                      <Pencil className="size-4" />
                    </button>
                    <DeleteButton
                      label="Delete vendor"
                      confirmText={`Delete ${v.name}? Parts linked to it keep their history.`}
                      onDelete={() => deleteVendor(v.id)}
                    />
                  </div>
                </div>
                <ul className="mt-3 space-y-1.5 text-sm">
                  {v.website && (
                    <li>
                      <a
                        href={v.website}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 font-semibold text-accent hover:underline"
                      >
                        <ExternalLink className="size-3.5" />{" "}
                        {v.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
                      </a>
                    </li>
                  )}
                  {v.phone && (
                    <li>
                      <a
                        href={`tel:${v.phone.replace(/[^\d+]/g, "")}`}
                        className="inline-flex items-center gap-1.5 hover:text-accent"
                      >
                        <Phone className="size-3.5 text-ink-3" /> {v.phone}
                      </a>
                    </li>
                  )}
                  {v.address && (
                    <li>
                      <a
                        href={`https://maps.google.com/?q=${encodeURIComponent(v.address)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-start gap-1.5 hover:text-accent"
                      >
                        <MapPin className="mt-0.5 size-3.5 shrink-0 text-ink-3" /> {v.address}
                      </a>
                    </li>
                  )}
                </ul>
                {v.notes && (
                  <p className="mt-2 text-sm whitespace-pre-line text-ink-2">{v.notes}</p>
                )}
                <p className="mt-auto border-t border-line pt-2 font-mono text-xs text-ink-3">
                  {stats[v.id]
                    ? `${formatMoney(stats[v.id].spent)} on ${stats[v.id].parts} part line${stats[v.id].parts === 1 ? "" : "s"} · ${stats[v.id].stocked} stocked`
                    : "No parts linked yet"}
                </p>
              </Card>
            ),
          )}
        </div>
      )}
    </>
  );
}

function VendorForm({ vendor, onDone }: { vendor?: Vendor; onDone: () => void }) {
  const [state, action, pending] = useActionState<FormState, FormData>(async (prev, formData) => {
    const result = await saveVendor(prev, formData);
    if (result?.ok) onDone();
    return result;
  }, undefined);

  return (
    <form
      action={action}
      className="mb-4 rounded-md border border-dashed border-accent/60 bg-accent-soft/40 p-4"
    >
      {vendor && <input type="hidden" name="id" value={vendor.id} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name *" htmlFor="v-name">
          <Input
            id="v-name"
            name="name"
            required
            autoFocus
            defaultValue={vendor?.name}
            placeholder="RockAuto"
          />
        </Field>
        <Field label="Type" htmlFor="v-kind">
          <Select id="v-kind" name="kind" defaultValue={vendor?.kind ?? "parts"}>
            {Object.entries(VENDOR_KIND_LABELS).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Website" htmlFor="v-web">
          <Input
            id="v-web"
            name="website"
            defaultValue={vendor?.website ?? ""}
            placeholder="rockauto.com"
          />
        </Field>
        <Field label="Phone" htmlFor="v-phone">
          <Input id="v-phone" name="phone" type="tel" defaultValue={vendor?.phone ?? ""} />
        </Field>
        <Field label="Address" htmlFor="v-addr" className="sm:col-span-2">
          <Input id="v-addr" name="address" defaultValue={vendor?.address ?? ""} />
        </Field>
        <Field label="Notes" htmlFor="v-notes" className="sm:col-span-2">
          <Textarea
            id="v-notes"
            name="notes"
            defaultValue={vendor?.notes ?? ""}
            className="min-h-16"
            placeholder="Ask for Dave at the parts counter"
          />
        </Field>
      </div>
      <div className="mt-3">
        <ErrorNote>{state?.error}</ErrorNote>
      </div>
      <div className="mt-3 flex gap-2">
        <Button type="submit" size="sm" variant="primary" disabled={pending}>
          {pending ? "Saving…" : vendor ? "Save" : "Add vendor"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
