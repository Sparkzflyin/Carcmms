"use server";

import { refresh } from "next/cache";
import { requireUser } from "@/lib/auth";
import { EXAMPLE_TEMPLATES } from "@/lib/example-checklists";
import { VENDOR_KIND_LABELS, type VendorKind } from "@/lib/types";
import { vendorIdForName } from "@/lib/vendors";

export type FormState = { error?: string; ok?: boolean } | undefined;

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

function lines(formData: FormData, key: string) {
  return String(formData.get(key) ?? "")
    .split("\n")
    .map((l) => l.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 60);
}

function website(value: string | null) {
  if (!value) return null;
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

// ---------------------------------------------------------------------------
// Vendors
// ---------------------------------------------------------------------------

export async function saveVendor(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await requireUser();
  const name = text(formData, "name");
  if (!name) return { error: "Vendor name is required." };
  const kind = String(formData.get("kind"));
  const row = {
    name,
    kind: kind in VENDOR_KIND_LABELS ? (kind as VendorKind) : "other",
    website: website(text(formData, "website")),
    phone: text(formData, "phone"),
    address: text(formData, "address"),
    notes: text(formData, "notes"),
  };
  const id = text(formData, "id");
  const { error } = id
    ? await supabase.from("vendors").update(row).eq("id", id)
    : await supabase.from("vendors").insert(row);
  if (error) {
    return {
      error: error.code === "23505" ? "You already have a vendor with that name." : error.message,
    };
  }
  refresh();
  return { ok: true };
}

export async function deleteVendor(id: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("vendors").delete().eq("id", id);
  if (error) throw error;
  refresh();
}

// ---------------------------------------------------------------------------
// Inventory
// ---------------------------------------------------------------------------

export async function saveInventoryItem(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await requireUser();
  const name = text(formData, "name");
  if (!name) return { error: "Item name is required." };
  const row = {
    name,
    part_number: text(formData, "part_number"),
    category: text(formData, "category"),
    quantity: num(formData, "quantity") ?? 0,
    unit: text(formData, "unit") ?? "ea",
    min_quantity: Math.max(0, num(formData, "min_quantity") ?? 0),
    unit_cost: num(formData, "unit_cost"),
    location: text(formData, "location"),
    vendor_id: await vendorIdForName(supabase, text(formData, "vendor")),
    notes: text(formData, "notes"),
  };
  const id = text(formData, "id");
  const { error } = id
    ? await supabase.from("inventory_items").update(row).eq("id", id)
    : await supabase.from("inventory_items").insert(row);
  if (error) return { error: error.message };
  refresh();
  return { ok: true };
}

export async function adjustStock(id: string, delta: number) {
  const { supabase } = await requireUser();
  const { data, error: readError } = await supabase
    .from("inventory_items")
    .select("quantity")
    .eq("id", id)
    .single();
  if (readError) throw readError;
  const { error } = await supabase
    .from("inventory_items")
    .update({ quantity: Math.max(0, Number(data.quantity) + delta) })
    .eq("id", id);
  if (error) throw error;
  refresh();
}

export async function deleteInventoryItem(id: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("inventory_items").delete().eq("id", id);
  if (error) throw error;
  refresh();
}

// ---------------------------------------------------------------------------
// Checklist templates
// ---------------------------------------------------------------------------

export async function saveChecklistTemplate(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await requireUser();
  const name = text(formData, "name");
  if (!name) return { error: "Give the checklist a name." };
  const steps = lines(formData, "steps");
  const tools = lines(formData, "tools");
  if (steps.length === 0 && tools.length === 0) return { error: "Add at least one step or tool." };
  const applies = String(formData.get("applies_to"));
  const row = {
    name,
    description: text(formData, "description"),
    applies_to: ["car", "motorcycle"].includes(applies) ? applies : "all",
    steps,
    tools,
  };
  const id = text(formData, "id");
  const { error } = id
    ? await supabase.from("checklist_templates").update(row).eq("id", id)
    : await supabase.from("checklist_templates").insert(row);
  if (error) return { error: error.message };
  refresh();
  return { ok: true };
}

export async function deleteChecklistTemplate(id: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("checklist_templates").delete().eq("id", id);
  if (error) throw error;
  refresh();
}

export async function addExampleTemplates() {
  const { supabase } = await requireUser();
  const { data } = await supabase.from("checklist_templates").select("name");
  const have = new Set((data ?? []).map((t) => (t.name as string).toLowerCase()));
  const rows = EXAMPLE_TEMPLATES.filter((t) => !have.has(t.name.toLowerCase()));
  if (rows.length) {
    const { error } = await supabase.from("checklist_templates").insert(rows);
    if (error) throw error;
  }
  refresh();
}

// ---------------------------------------------------------------------------
// Work order checklists
// ---------------------------------------------------------------------------

export async function applyChecklistTemplate(workOrderId: string, templateId: string) {
  const { supabase } = await requireUser();
  const [{ data: template, error }, { count }] = await Promise.all([
    supabase.from("checklist_templates").select("steps, tools").eq("id", templateId).single(),
    supabase
      .from("work_order_checklist_items")
      .select("id", { count: "exact", head: true })
      .eq("work_order_id", workOrderId),
  ]);
  if (error) throw error;

  const offset = count ?? 0;
  const rows = [
    ...(template.tools as string[]).map((t, i) => ({
      work_order_id: workOrderId,
      kind: "tool",
      text: t,
      sort_order: offset + i,
    })),
    ...(template.steps as string[]).map((t, i) => ({
      work_order_id: workOrderId,
      kind: "step",
      text: t,
      sort_order: offset + i,
    })),
  ];
  if (rows.length) {
    const { error: insertError } = await supabase.from("work_order_checklist_items").insert(rows);
    if (insertError) throw insertError;
  }
  refresh();
}

export async function addChecklistItem(workOrderId: string, kind: "step" | "tool", value: string) {
  const { supabase } = await requireUser();
  const itemText = value.trim().slice(0, 300);
  if (!itemText) return;
  const { count } = await supabase
    .from("work_order_checklist_items")
    .select("id", { count: "exact", head: true })
    .eq("work_order_id", workOrderId);
  const { error } = await supabase
    .from("work_order_checklist_items")
    .insert({ work_order_id: workOrderId, kind, text: itemText, sort_order: count ?? 0 });
  if (error) throw error;
  refresh();
}

export async function toggleChecklistItem(id: string, done: boolean) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("work_order_checklist_items").update({ done }).eq("id", id);
  if (error) throw error;
  refresh();
}

export async function deleteChecklistItem(id: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("work_order_checklist_items").delete().eq("id", id);
  if (error) throw error;
  refresh();
}
