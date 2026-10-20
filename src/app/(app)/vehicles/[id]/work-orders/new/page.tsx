import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageHeader, Skeleton } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { vehicleName } from "@/lib/format";
import type { Vehicle } from "@/lib/types";
import { NewWorkOrderForm } from "./form";

export const metadata: Metadata = { title: "New work order" };

export default function NewWorkOrderPage({ params }: PageProps<"/vehicles/[id]/work-orders/new">) {
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <NewWorkOrder params={params} />
    </Suspense>
  );
}

async function NewWorkOrder({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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
      <NewWorkOrderForm vehicle={vehicle} />
    </>
  );
}
