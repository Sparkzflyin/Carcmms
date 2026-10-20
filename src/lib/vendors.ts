import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

// Link a typed vendor name to a saved vendor when one matches (case-insensitive).
// Unknown names stay as plain text; nothing is created implicitly.
export async function vendorIdForName(supabase: SupabaseClient, name: string | null) {
  if (!name) return null;
  const { data } = await supabase.from("vendors").select("id, name");
  const match = (data ?? []).find((v) => v.name.toLowerCase() === name.trim().toLowerCase());
  return (match?.id as string | undefined) ?? null;
}
