"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Card } from "@/components/ui";
import type { CustomFieldDefinition } from "@/lib/types";
import { AddFieldInline } from "../vehicles/vehicle-form";
import { DeleteButton } from "../work-orders/[id]/controls";
import { deleteCustomField, renameCustomField } from "./actions";

const TYPE_LABELS = {
  text: "Text",
  number: "Number",
  date: "Date",
  select: "Dropdown",
  boolean: "Yes / No",
};
const APPLIES_LABELS = { all: "All vehicles", car: "Cars", motorcycle: "Motorcycles" };

export function FieldsManager({ fields }: { fields: CustomFieldDefinition[] }) {
  const router = useRouter();
  const [, start] = useTransition();

  return (
    <div className="flex flex-col gap-4">
      {fields.length > 0 && (
        <Card className="divide-y divide-line">
          {fields.map((f) => (
            <div key={f.id} className="flex items-center gap-4 px-4 py-3">
              <input
                defaultValue={f.label}
                aria-label="Field name"
                onBlur={(e) => {
                  if (e.target.value.trim() && e.target.value !== f.label) {
                    start(() => renameCustomField(f.id, e.target.value));
                  }
                }}
                className="min-w-0 flex-1 rounded border border-transparent bg-transparent px-1 py-0.5 font-semibold hover:border-line-strong focus:border-accent focus:outline-none"
              />
              <span className="hidden text-sm text-ink-3 sm:inline">
                {TYPE_LABELS[f.field_type]}
                {f.field_type === "select" && `: ${f.options.join(", ")}`}
              </span>
              <span className="rounded-sm bg-panel-2 px-2 py-0.5 font-display text-xs font-bold tracking-wider text-ink-2 uppercase">
                {APPLIES_LABELS[f.applies_to]}
              </span>
              <DeleteButton
                label="Delete field"
                confirmText={`Delete "${f.label}"? Values saved on your vehicles will be hidden.`}
                onDelete={() => deleteCustomField(f.id)}
              />
            </div>
          ))}
        </Card>
      )}
      <div>
        <AddFieldInline onAdded={() => router.refresh()} />
      </div>
    </div>
  );
}
