"use client";

import { AlertTriangle, Minus, Package, Pencil, Plus, Search } from "lucide-react";
import { useActionState, useState, useTransition } from "react";
import { Button, Card, EmptyState, ErrorNote, Field, Input, Textarea, cx } from "@/components/ui";
import { formatMoney } from "@/lib/format";
import type { InventoryItem, Vendor } from "@/lib/types";
import { DeleteButton } from "../work-orders/[id]/controls";
import { adjustStock, deleteInventoryItem, saveInventoryItem, type FormState } from "./actions";

type VendorLite = Pick<Vendor, "id" | "name" | "website">;

const UNITS = ["ea", "qt", "gal", "L", "ml", "oz", "ft", "m", "set", "pair", "box"];

function isLow(item: InventoryItem) {
  return Number(item.min_quantity) > 0 && Number(item.quantity) <= Number(item.min_quantity);
}

function qty(n: number) {
  return Number.isInteger(Number(n)) ? String(Number(n)) : Number(n).toFixed(2).replace(/0$/, "");
}

export function InventoryView({ items, vendors }: { items: InventoryItem[]; vendors: VendorLite[] }) {
  const [query, setQuery] = useState("");
  const [lowOnly, setLowOnly] = useState(false);
  const [adding, setAdding] = useState(false);
  const vendorById = new Map(vendors.map((v) => [v.id, v]));

  const low = items.filter(isLow);
  const needle = query.trim().toLowerCase();
  const shown = items.filter(
    (i) =>
      (!lowOnly || isLow(i)) &&
      (!needle ||
        [i.name, i.part_number, i.category, i.location, i.vendor_id && vendorById.get(i.vendor_id)?.name]
          .filter(Boolean)
          .some((s) => String(s).toLowerCase().includes(needle))),
  );
  const value = items.reduce((sum, i) => sum + Math.max(0, Number(i.quantity)) * Number(i.unit_cost ?? 0), 0);

  return (
    <>
      {low.length > 0 && (
        <button
          type="button"
          onClick={() => setLowOnly((v) => !v)}
          className="mb-4 flex w-full items-center gap-3 rounded-lg border border-warn/40 bg-warn-soft px-4 py-3 text-left text-sm text-warn"
        >
          <AlertTriangle className="size-5 shrink-0" />
          <span className="flex-1">
            <strong>{low.length} item{low.length === 1 ? "" : "s"} low on stock:</strong>{" "}
            {low.slice(0, 4).map((i) => i.name).join(", ")}
            {low.length > 4 && "…"}
          </span>
          <span className="font-semibold underline">{lowOnly ? "Show all" : "Show only these"}</span>
        </button>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-3" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, part #, category, location…"
            aria-label="Search inventory"
            className="pl-9"
          />
        </div>
        <Button type="button" variant="primary" onClick={() => setAdding(true)} disabled={adding}>
          <Plus className="size-4" strokeWidth={3} /> Add item
        </Button>
      </div>

      {adding && (
        <ItemForm vendors={vendors} onDone={() => setAdding(false)} />
      )}

      {items.length === 0 && !adding ? (
        <EmptyState icon={<Package className="size-8" />} title="Shelf's empty">
          Track filters, fluids, bulbs and spares you keep on hand. When you use one on a work order, it
          comes off the shelf automatically.
        </EmptyState>
      ) : (
        <>
          <p className="mb-2 font-mono text-xs tracking-wider text-ink-3 uppercase">
            {shown.length} of {items.length} items · stock value {formatMoney(value)}
          </p>
          <Card className="divide-y divide-line">
            {shown.map((item) => (
              <ItemRow key={item.id} item={item} vendors={vendors} vendor={item.vendor_id ? vendorById.get(item.vendor_id) : undefined} />
            ))}
            {shown.length === 0 && <p className="px-4 py-6 text-center text-sm text-ink-3">No items match.</p>}
          </Card>
        </>
      )}
    </>
  );
}

function ItemRow({ item, vendor, vendors }: { item: InventoryItem; vendor?: VendorLite; vendors: VendorLite[] }) {
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();
  const lowStock = isLow(item);

  if (editing) {
    return (
      <div className="p-3">
        <ItemForm item={item} vendors={vendors} vendorName={vendor?.name} onDone={() => setEditing(false)} />
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
      <div className="min-w-48 flex-1">
        <p className="font-semibold">
          {item.name}
          {item.part_number && <span className="ml-2 font-mono text-xs font-normal text-ink-3">{item.part_number}</span>}
        </p>
        <p className="text-xs text-ink-3">
          {[item.category, item.location && `📍 ${item.location}`, vendor?.name].filter(Boolean).join(" · ") || "—"}
          {item.unit_cost != null && ` · ${formatMoney(Number(item.unit_cost))}/${item.unit}`}
        </p>
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label={`Use one ${item.name}`}
          disabled={pending || Number(item.quantity) <= 0}
          onClick={() => start(() => adjustStock(item.id, -1))}
          className="rounded-md border border-line-strong p-1.5 text-ink-2 hover:bg-panel-2 disabled:opacity-40"
        >
          <Minus className="size-3.5" />
        </button>
        <span
          className={cx(
            "min-w-20 text-center font-mono text-lg font-bold",
            Number(item.quantity) <= 0 ? "text-danger" : lowStock ? "text-warn" : "text-ink",
          )}
          title={item.min_quantity ? `Reorder at ${qty(item.min_quantity)}` : undefined}
        >
          {qty(item.quantity)} <span className="text-xs font-normal text-ink-3">{item.unit}</span>
        </span>
        <button
          type="button"
          aria-label={`Add one ${item.name}`}
          disabled={pending}
          onClick={() => start(() => adjustStock(item.id, 1))}
          className="rounded-md border border-line-strong p-1.5 text-ink-2 hover:bg-panel-2 disabled:opacity-40"
        >
          <Plus className="size-3.5" />
        </button>
      </div>
      <div className="flex items-center gap-1">
        {lowStock && (
          <span className="rounded-sm bg-warn-soft px-2 py-0.5 font-display text-xs font-bold tracking-wider text-warn uppercase">
            {Number(item.quantity) <= 0 ? "Out" : "Low"}
          </span>
        )}
        {lowStock && vendor?.website && (
          <a href={vendor.website} target="_blank" rel="noreferrer" className="text-xs font-semibold text-accent hover:underline">
            Reorder
          </a>
        )}
        <button
          type="button"
          aria-label="Edit item"
          onClick={() => setEditing(true)}
          className="rounded p-1 text-ink-3 hover:bg-panel-2 hover:text-ink"
        >
          <Pencil className="size-4" />
        </button>
        <DeleteButton label="Delete item" confirmText={`Delete ${item.name} from inventory?`} onDelete={() => deleteInventoryItem(item.id)} />
      </div>
    </div>
  );
}

function ItemForm({
  item,
  vendors,
  vendorName,
  onDone,
}: {
  item?: InventoryItem;
  vendors: VendorLite[];
  vendorName?: string;
  onDone: () => void;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(async (prev, formData) => {
    const result = await saveInventoryItem(prev, formData);
    if (result?.ok) onDone();
    return result;
  }, undefined);

  return (
    <form action={action} className="mb-4 rounded-md border border-dashed border-accent/60 bg-accent-soft/40 p-4">
      {item && <input type="hidden" name="id" value={item.id} />}
      <div className="grid gap-3 sm:grid-cols-6">
        <Field label="Item *" htmlFor="i-name" className="sm:col-span-3">
          <Input id="i-name" name="name" required autoFocus defaultValue={item?.name} placeholder="Oil filter" />
        </Field>
        <Field label="Part #" htmlFor="i-pn" className="sm:col-span-3">
          <Input id="i-pn" name="part_number" defaultValue={item?.part_number ?? ""} className="font-mono" placeholder="PH7317" />
        </Field>
        <Field label="Quantity" htmlFor="i-qty">
          <Input id="i-qty" name="quantity" inputMode="decimal" defaultValue={item ? qty(item.quantity) : "1"} />
        </Field>
        <Field label="Unit" htmlFor="i-unit">
          <Input id="i-unit" name="unit" list="units" defaultValue={item?.unit ?? "ea"} />
          <datalist id="units">{UNITS.map((u) => <option key={u} value={u} />)}</datalist>
        </Field>
        <Field label="Reorder at" htmlFor="i-min" hint="Low-stock alert">
          <Input id="i-min" name="min_quantity" inputMode="decimal" defaultValue={item ? qty(item.min_quantity) : ""} placeholder="0" />
        </Field>
        <Field label="Unit cost" htmlFor="i-cost">
          <Input id="i-cost" name="unit_cost" inputMode="decimal" defaultValue={item?.unit_cost ?? ""} placeholder="$" />
        </Field>
        <Field label="Category" htmlFor="i-cat" className="sm:col-span-2">
          <Input id="i-cat" name="category" list="categories" defaultValue={item?.category ?? ""} placeholder="Filters" />
          <datalist id="categories">
            {["Filters", "Fluids", "Brakes", "Electrical", "Bulbs", "Ignition", "Hardware", "Belts & hoses", "Consumables"].map((c) => <option key={c} value={c} />)}
          </datalist>
        </Field>
        <Field label="Location" htmlFor="i-loc" className="sm:col-span-3">
          <Input id="i-loc" name="location" defaultValue={item?.location ?? ""} placeholder="Shelf B, bin 3" />
        </Field>
        <Field label="Vendor" htmlFor="i-vendor" className="sm:col-span-3" hint={vendors.length === 0 ? "Add vendors on the Vendors tab to link them." : undefined}>
          <Input id="i-vendor" name="vendor" list="vendor-names" defaultValue={vendorName ?? ""} />
          <datalist id="vendor-names">{vendors.map((v) => <option key={v.id} value={v.name} />)}</datalist>
        </Field>
        <Field label="Notes" htmlFor="i-notes" className="sm:col-span-6">
          <Textarea id="i-notes" name="notes" defaultValue={item?.notes ?? ""} className="min-h-16" placeholder="Fits the Tacoma and the Civic" />
        </Field>
      </div>
      <div className="mt-3">
        <ErrorNote>{state?.error}</ErrorNote>
      </div>
      <div className="mt-3 flex gap-2">
        <Button type="submit" size="sm" variant="primary" disabled={pending}>
          {pending ? "Saving…" : item ? "Save" : "Add to inventory"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
