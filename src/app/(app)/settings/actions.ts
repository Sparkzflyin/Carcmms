"use server";

import { refresh } from "next/cache";
import { requireUser } from "@/lib/auth";

export async function deleteCustomField(id: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("custom_field_definitions").delete().eq("id", id);
  if (error) throw error;
  refresh();
}

export async function renameCustomField(id: string, label: string) {
  const { supabase } = await requireUser();
  const trimmed = label.trim();
  if (!trimmed) return;
  const { error } = await supabase
    .from("custom_field_definitions")
    .update({ label: trimmed })
    .eq("id", id);
  if (error) throw error;
  refresh();
}
