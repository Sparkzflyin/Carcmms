import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader, SectionTitle, Skeleton } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import type { CustomFieldDefinition } from "@/lib/types";
import { FieldsManager } from "./fields-manager";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <>
      <PageHeader eyebrow="Account" title="Settings" />
      <section className="max-w-3xl">
        <SectionTitle>Custom vehicle fields</SectionTitle>
        <p className="mb-4 text-sm text-ink-2">
          Extra fields that show up on the vehicle form and spec sheet, like tire size, oil weight
          or insurance renewal date.
        </p>
        <Suspense fallback={<Skeleton className="h-40" />}>
          <Fields />
        </Suspense>
      </section>
    </>
  );
}

async function Fields() {
  const { supabase } = await requireUser();
  const { data } = await supabase
    .from("custom_field_definitions")
    .select("id, label, field_type, options, applies_to, sort_order")
    .order("sort_order");
  return <FieldsManager fields={(data ?? []) as CustomFieldDefinition[]} />;
}
