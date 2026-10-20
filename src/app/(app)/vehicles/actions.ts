"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import type { CustomFieldDefinition, CustomFieldType } from "@/lib/types";
import { decodeVin } from "@/lib/vin";

export type FormState = { error?: string } | undefined;

const TEXT_FIELDS = [
  "nickname",
  "make",
  "model",
  "trim",
  "vin",
  "body_style",
  "engine",
  "transmission",
  "drivetrain",
  "fuel_type",
  "color",
  "license_plate",
  "notes",
  "photo_path",
] as const;

function text(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value === "" ? null : value;
}

function int(formData: FormData, key: string) {
  const value = text(formData, key);
  if (value == null) return null;
  const n = Number(value.replace(/,/g, ""));
  return Number.isFinite(n) ? Math.round(n) : null;
}

export async function saveVehicle(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await requireUser();
  const id = text(formData, "id");

  const row: Record<string, unknown> = {};
  for (const key of TEXT_FIELDS) row[key] = text(formData, key);
  row.vin = (row.vin as string | null)?.toUpperCase() ?? null;
  row.license_plate = (row.license_plate as string | null)?.toUpperCase() ?? null;
  row.vehicle_type = formData.get("vehicle_type") === "motorcycle" ? "motorcycle" : "car";
  row.year = int(formData, "year");
  row.odometer = int(formData, "odometer") ?? 0;
  row.odometer_unit = ["mi", "km", "hr"].includes(String(formData.get("odometer_unit")))
    ? formData.get("odometer_unit")
    : "mi";
  row.purchase_date = text(formData, "purchase_date");
  const price = text(formData, "purchase_price");
  row.purchase_price = price == null ? null : Number(price.replace(/[$,]/g, ""));

  if (!row.make || !row.model) return { error: "Make and model are required." };
  if (row.year != null && ((row.year as number) < 1885 || (row.year as number) > 2100)) {
    return { error: "That year doesn't look right." };
  }
  if (row.odometer as number < 0) return { error: "Odometer can't be negative." };

  // Custom field inputs are named "cf:<definition id>".
  const custom: Record<string, string | number | boolean> = {};
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("cf:") || typeof value !== "string" || value.trim() === "") continue;
    const type = formData.get(`cftype:${key.slice(3)}`) as CustomFieldType | null;
    custom[key.slice(3)] =
      type === "number" ? Number(value) : type === "boolean" ? value === "true" : value.trim();
  }
  row.custom_fields = custom;

  const result = id
    ? await supabase.from("vehicles").update(row).eq("id", id).select("id").single()
    : await supabase.from("vehicles").insert(row).select("id").single();

  if (result.error) return { error: result.error.message };
  redirect(`/vehicles/${result.data.id}`);
}

export async function setVehicleArchived(id: string, archived: boolean) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("vehicles").update({ archived }).eq("id", id);
  if (error) throw error;
  refresh();
}

export async function deleteVehicle(id: string) {
  const { supabase } = await requireUser();
  const { data } = await supabase.from("vehicles").select("photo_path").eq("id", id).single();
  const { error } = await supabase.from("vehicles").delete().eq("id", id);
  if (error) throw error;
  if (data?.photo_path) await supabase.storage.from("photos").remove([data.photo_path]);
  redirect("/");
}

// Used inline from the vehicle form ("+ Add a field") and from settings.
export async function createCustomField(input: {
  label: string;
  field_type: CustomFieldType;
  options: string[];
  applies_to: CustomFieldDefinition["applies_to"];
}): Promise<{ field?: CustomFieldDefinition; error?: string }> {
  const { supabase } = await requireUser();
  const label = input.label.trim();
  if (!label) return { error: "Give the field a name." };
  const options = input.options.map((o) => o.trim()).filter(Boolean);
  if (input.field_type === "select" && options.length === 0) {
    return { error: "Add at least one choice for a dropdown." };
  }

  const { count } = await supabase
    .from("custom_field_definitions")
    .select("id", { count: "exact", head: true });

  const { data, error } = await supabase
    .from("custom_field_definitions")
    .insert({
      label,
      field_type: input.field_type,
      options: input.field_type === "select" ? options : [],
      applies_to: input.applies_to,
      sort_order: count ?? 0,
    })
    .select("id, label, field_type, options, applies_to, sort_order")
    .single();

  if (error) return { error: error.message };
  return { field: data as CustomFieldDefinition };
}

export async function lookupVin(vin: string) {
  await requireUser();
  return decodeVin(vin);
}
