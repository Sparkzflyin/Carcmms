import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageHeader, Skeleton } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { vehicleName } from "@/lib/format";
import type { Vehicle } from "@/lib/types";
import { NewWorkOrderForm } from "./form";

export const metadata: Metadata = { title: "New work order" };

export default function NewWorkOrderPage({ params, searchParams }: PageProps<"/vehicles/[id]/work-orders/new">) {
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <NewWorkOrder params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function NewWorkOrder({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  // Prefill, e.g. from the trouble-code lookup.
  const defaults = { title: one(sp.title), description: one(sp.description), priority: one(sp.priority) };
  const { supabase } = await requireUser();
  const { data } = await supabase
    .from("vehicles")
    .select("id, year, make, model, odometer, odometer_unit")
    .eq("id", id)
    .maybeSingle();
  const vehicle = data as Pick<Vehicle, "id" | "year" | "make" | "model" | "odometer" | "odometer_unit"> | null;
  if (!vehicle) notFound();

  return (
    <>
      <PageHeader eyebrow={`${vehicleName(vehicle)} / New`} title="New work order" />
      <NewWorkOrderForm vehicle={vehicle} defaults={defaults} />
    </>
  );
}
