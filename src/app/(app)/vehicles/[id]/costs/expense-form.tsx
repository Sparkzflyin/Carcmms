"use client";

import { Plus } from "lucide-react";
import { useActionState, useState } from "react";
import { Button, Card, ErrorNote, Field, Input, Select } from "@/components/ui";
import { unitLabel } from "@/lib/format";
import { EXPENSE_CATEGORY_LABELS, type OdometerUnit, type Vendor } from "@/lib/types";
import { DeleteButton } from "../../../work-orders/[id]/controls";
import { deleteExpense, saveExpense, type ExpenseState } from "../../actions";

export function ExpenseForm({
  vehicleId,
  odometer,
  unit,
  vendors,
}: {
  vehicleId: string;
  odometer: number;
  unit: OdometerUnit;
  vendors: Pick<Vendor, "id" | "name">[];
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<ExpenseState, FormData>(
    async (prev, formData) => {
      const result = await saveExpense(prev, formData);
      if (result?.ok) setOpen(false);
      return result;
    },
    undefined,
  );

  if (!open) {
    return (
      <Button type="button" variant="primary" onClick={() => setOpen(true)}>
        <Plus className="size-4" strokeWidth={3} /> Add expense
      </Button>
    );
  }

  return (
    <Card className="w-full p-4">
      <form action={action}>
        <input type="hidden" name="vehicle_id" value={vehicleId} />
        <div className="grid gap-3 sm:grid-cols-6">
          <Field label="Amount *" htmlFor="x-amount" className="sm:col-span-2">
            <Input
              id="x-amount"
              name="amount"
              inputMode="decimal"
              required
              autoFocus
              placeholder="$"
              className="font-mono"
            />
          </Field>
          <Field label="Category" htmlFor="x-cat" className="sm:col-span-2">
            <Select id="x-cat" name="category" defaultValue="insurance">
              {Object.entries(EXPENSE_CATEGORY_LABELS).map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Date" htmlFor="x-date" className="sm:col-span-2">
            <Input
              id="x-date"
              name="date"
              type="date"
              defaultValue={new Date().toLocaleDateString("en-CA")}
            />
          </Field>
          <Field label="Description" htmlFor="x-desc" className="sm:col-span-3">
            <Input id="x-desc" name="description" placeholder="6-month premium" />
          </Field>
          <Field label="Vendor" htmlFor="x-vendor" className="sm:col-span-2">
            <Input id="x-vendor" name="vendor" list="expense-vendors" />
            <datalist id="expense-vendors">
              {vendors.map((v) => (
                <option key={v.id} value={v.name} />
              ))}
            </datalist>
          </Field>
          <Field label={`Odometer (${unitLabel(unit)})`} htmlFor="x-odo">
            <Input
              id="x-odo"
              name="odometer"
              inputMode="numeric"
              defaultValue={odometer}
              className="font-mono"
            />
          </Field>
        </div>
        <div className="mt-3">
          <ErrorNote>{state?.error}</ErrorNote>
        </div>
        <div className="mt-3 flex gap-2">
          <Button type="submit" size="sm" variant="primary" disabled={pending}>
            {pending ? "Saving…" : "Add expense"}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}

export function DeleteExpenseButton({ id }: { id: string }) {
  return (
    <DeleteButton
      label="Delete expense"
      confirmText="Delete this expense?"
      onDelete={() => deleteExpense(id)}
    />
  );
}
