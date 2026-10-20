import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export const PHOTO_BUCKET = "photos";

// Photos live in a private bucket; hand out short-lived signed URLs.
export async function signPhotoUrls(supabase: SupabaseClient, paths: (string | null)[]) {
  const unique = [...new Set(paths.filter((p): p is string => Boolean(p)))];
  const urls = new Map<string, string>();
  if (unique.length === 0) return urls;

  const { data } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrls(unique, 60 * 60);
  for (const item of data ?? []) {
    if (item.path && item.signedUrl) urls.set(item.path, item.signedUrl);
  }
  return urls;
}
