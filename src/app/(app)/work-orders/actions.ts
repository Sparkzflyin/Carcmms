"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import {
  PART_STATUS_LABELS,
  STATUS_LABELS,
  type PartStatus,
  type WorkOrderPriority,
  type WorkOrderStatus,
} from "@/lib/types";

export type FormState = { error?: string; ok?: boolean } | undefined;

const STATUSES = Object.keys(STATUS_LABELS) as WorkOrderStatus[];
const PRIORITIES: WorkOrderPriority[] = ["low", "medium", "high", "critical"];
const PART_STATUSES = Object.keys(PART_STATUS_LABELS) as PartStatus[];

function text(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value === "" ? null : value;
}

function num(formData: FormData, key: string) {
  const value = text(formData, key);
  if (value == null) return null;
  const n = Number(value.replace(/[$,]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function pick<T extends string>(value: FormDataEntryValue | null, allowed: T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

// ---------------------------------------------------------------------------
// Work orders
// ---------------------------------------------------------------------------

export async function createWorkOrder(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await requireUser();
  const title = text(formData, "title");
  if (!title) return { error: "Give the work order a title." };

  const odometer = num(formData, "odometer");
  const { data, error } = await supabase
    .from("work_orders")
    .insert({
      vehicle_id: text(formData, "vehicle_id"),
      title,
      description: text(formData, "description"),
      status: pick(formData.get("status"), STATUSES, "open"),
      priority: pick(formData.get("priority"), PRIORITIES, "medium"),
      odometer: odometer == null ? null : Math.round(odometer),
      due_date: text(formData, "due_date"),
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  redirect(`/work-orders/${data.id}`);
}

export async function updateWorkOrder(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await requireUser();
  const title = text(formData, "title");
  if (!title) return { error: "Title can't be empty." };
  const odometer = num(formData, "odometer");

  const { error } = await supabase
    .from("work_orders")
    .update({
      title,
      description: text(formData, "description"),
      priority: pick(formData.get("priority"), PRIORITIES, "medium"),
      odometer: odometer == null ? null : Math.round(odometer),
      due_date: text(formData, "due_date"),
      labor_hours: num(formData, "labor_hours") ?? 0,
      labor_rate: num(formData, "labor_rate") ?? 0,
    })
    .eq("id", text(formData, "id"));

  if (error) return { error: error.message };
  refresh();
  return { ok: true };
}

export async function setWorkOrderStatus(id: string, status: WorkOrderStatus) {
  const { supabase } = await requireUser();
  if (!STATUSES.includes(status)) throw new Error("Unknown status");

  const { error } = await supabase.from("work_orders").update({ status }).eq("id", id);
  if (error) throw error;
  await supabase.from("work_order_notes").insert({
    work_order_id: id,
    kind: "status",
    body: `Status changed to ${STATUS_LABELS[status]}`,
  });
  refresh();
}

export async function deleteWorkOrder(id: string, vehicleId: string) {
  const { supabase } = await requireUser();
  const { data: notes } = await supabase
    .from("work_order_notes")
    .select("photo_paths")
    .eq("work_order_id", id);
  const { error } = await supabase.from("work_orders").delete().eq("id", id);
  if (error) throw error;
  const paths = (notes ?? []).flatMap((n) => n.photo_paths as string[]);
  if (paths.length) await supabase.storage.from("photos").remove(paths);
  redirect(`/vehicles/${vehicleId}`);
}

// ---------------------------------------------------------------------------
// Parts
// ---------------------------------------------------------------------------

export async function addPart(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await requireUser();
  const name = text(formData, "name");
  if (!name) return { error: "Part name is required." };

  const { error } = await supabase.from("work_order_parts").insert({
    work_order_id: text(formData, "work_order_id"),
    name,
    part_number: text(formData, "part_number"),
    vendor: text(formData, "vendor"),
    quantity: num(formData, "quantity") ?? 1,
    unit_cost: num(formData, "unit_cost") ?? 0,
    status: pick(formData.get("status"), PART_STATUSES, "needed"),
  });
  if (error) return { error: error.message };
  refresh();
  return { ok: true };
}

export async function setPartStatus(id: string, status: PartStatus) {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("work_order_parts")
    .update({ status: pick(status, PART_STATUSES, "needed") })
    .eq("id", id);
  if (error) throw error;
  refresh();
}

export async function deletePart(id: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("work_order_parts").delete().eq("id", id);
  if (error) throw error;
  refresh();
}

// ---------------------------------------------------------------------------
// Notes (photos are uploaded to storage by the browser first)
// ---------------------------------------------------------------------------

export async function addNote(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase, user } = await requireUser();
  const body = text(formData, "body");
  const photoPaths = formData
    .getAll("photo_path")
    .map(String)
    // Only accept paths inside this user's own folder.
    .filter((p) => p.startsWith(`${user.id}/`));
  if (!body && photoPaths.length === 0) return { error: "Write a note or attach a photo." };

  const { error } = await supabase.from("work_order_notes").insert({
    work_order_id: text(formData, "work_order_id"),
    body,
    photo_paths: photoPaths,
  });
  if (error) return { error: error.message };
  refresh();
  return { ok: true };
}

export async function deleteNote(id: string) {
  const { supabase } = await requireUser();
  const { data } = await supabase.from("work_order_notes").select("photo_paths").eq("id", id).single();
  const { error } = await supabase.from("work_order_notes").delete().eq("id", id);
  if (error) throw error;
  if (data?.photo_paths?.length) await supabase.storage.from("photos").remove(data.photo_paths);
  refresh();
}

// ---------------------------------------------------------------------------
// Vehicle odometer + maintenance schedules
// ---------------------------------------------------------------------------

export async function updateOdometer(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await requireUser();
  const odometer = num(formData, "odometer");
  if (odometer == null || odometer < 0) return { error: "Enter a reading." };

  const { error } = await supabase
    .from("vehicles")
    .update({ odometer: Math.round(odometer) })
    .eq("id", text(formData, "vehicle_id"));
  if (error) return { error: error.message };
  // A new reading may push schedules over their interval.
  await supabase.rpc("create_due_maintenance_work_orders");
  refresh();
  return { ok: true };
}

export async function addSchedule(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await requireUser();
  const title = text(formData, "title");
  const distance = num(formData, "interval_distance");
  const months = num(formData, "interval_months");
  if (!title) return { error: "What's the service? e.g. Oil change." };
  if (!distance && !months) return { error: "Set a distance interval, a time interval, or both." };

  const lastOdometer = num(formData, "last_done_odometer");
  const { error } = await supabase.from("maintenance_schedules").insert({
    vehicle_id: text(formData, "vehicle_id"),
    title,
    description: text(formData, "description"),
    interval_distance: distance ? Math.round(distance) : null,
    interval_months: months ? Math.round(months) : null,
    last_done_odometer: lastOdometer == null ? null : Math.round(lastOdometer),
    last_done_date: text(formData, "last_done_date"),
  });
  if (error) return { error: error.message };
  await supabase.rpc("create_due_maintenance_work_orders");
  refresh();
  return { ok: true };
}

export async function deleteSchedule(id: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("maintenance_schedules").delete().eq("id", id);
  if (error) throw error;
  refresh();
}

// Record a service done outside a work order: files a completed work order so
// it shows in history, and the DB trigger rolls the schedule forward.
export async function logScheduleDone(scheduleId: string) {
  const { supabase } = await requireUser();
  const { data: schedule, error: readError } = await supabase
    .from("maintenance_schedules")
    .select("id, vehicle_id, title, vehicles(odometer)")
    .eq("id", scheduleId)
    .single();
  if (readError) throw readError;

  // If the reminder already opened a work order, close that one instead.
  const { data: open } = await supabase
    .from("work_orders")
    .select("id")
    .eq("maintenance_schedule_id", scheduleId)
    .not("status", "in", "(done,cancelled)")
    .limit(1)
    .maybeSingle();

  if (open) {
    await setWorkOrderStatus(open.id, "done");
    return;
  }

  const vehicle = schedule.vehicles as unknown as { odometer: number } | null;
  const { error } = await supabase.from("work_orders").insert({
    vehicle_id: schedule.vehicle_id,
    maintenance_schedule_id: schedule.id,
    title: schedule.title,
    description: "Logged as done from the maintenance schedule.",
    status: "done",
    priority: "low",
    odometer: vehicle?.odometer ?? null,
  });
  if (error) throw error;
  refresh();
}
