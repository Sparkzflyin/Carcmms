import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageHeader, Skeleton } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { vehicleName } from "@/lib/format";
import { signPhotoUrls } from "@/lib/storage";
import type { CustomFieldDefinition, Vehicle } from "@/lib/types";
import { VehicleForm } from "../../vehicle-form";
import { VehicleDangerZone } from "./danger-zone";

export const metadata: Metadata = { title: "Edit vehicle" };

export default function EditVehiclePage({ params }: PageProps<"/vehicles/[id]/edit">) {
  return (
    <Suspense fallback={<Skeleton className="h-[600px]" />}>
      <EditVehicle params={params} />
    </Suspense>
  );
}

async function EditVehicle({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await requireUser();
  const [vehicleRes, fieldsRes] = await Promise.all([
    supabase.from("vehicles").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("custom_field_definitions")
      .select("id, label, field_type, options, applies_to, sort_order")
      .order("sort_order"),
  ]);
  const vehicle = vehicleRes.data as Vehicle | null;
  if (!vehicle) notFound();
  const photos = await signPhotoUrls(supabase, [vehicle.photo_path]);

  return (
    <>
      <PageHeader eyebrow={`Garage / ${vehicleName(vehicle)} / Edit`} title="Edit vehicle" />
      <VehicleForm
        userId={user.id}
        vehicle={vehicle}
        photoUrl={vehicle.photo_path ? photos.get(vehicle.photo_path) : null}
        customFields={(fieldsRes.data ?? []) as CustomFieldDefinition[]}
      />
      <VehicleDangerZone id={vehicle.id} archived={vehicle.archived} />
    </>
  );
}
