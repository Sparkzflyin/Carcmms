import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Data Access Layer entry point: verifies the session and hands back a
// Supabase client scoped to that user. RLS enforces ownership on every query.
export async function requireUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) {
    redirect("/login");
  }
  return {
    supabase,
    user: { id: claims.sub, email: (claims.email as string | undefined) ?? "" },
  };
}
