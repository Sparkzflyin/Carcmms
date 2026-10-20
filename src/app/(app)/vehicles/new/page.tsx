import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader, Skeleton } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import type { CustomFieldDefinition } from "@/lib/types";
import { VehicleForm } from "../vehicle-form";

export const metadata: Metadata = { title: "Add vehicle" };

export default function NewVehiclePage() {
  return (
    <>
      <PageHeader eyebrow="Garage / New" title="Add a vehicle" />
      <Suspense fallback={<Skeleton className="h-[600px]" />}>
        <NewVehicle />
      </Suspense>
    </>
  );
}

async function NewVehicle() {
  const { supabase, user } = await requireUser();
  const { data } = await supabase
    .from("custom_field_definitions")
    .select("id, label, field_type, options, applies_to, sort_order")
    .order("sort_order");
  return <VehicleForm userId={user.id} customFields={(data ?? []) as CustomFieldDefinition[]} />;
}
