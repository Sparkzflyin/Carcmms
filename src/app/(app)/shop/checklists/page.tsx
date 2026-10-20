import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import type { ChecklistTemplate } from "@/lib/types";
import { ChecklistsView } from "./checklists-view";

export const metadata: Metadata = { title: "Checklists" };

export default function ChecklistsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <Checklists />
    </Suspense>
  );
}

async function Checklists() {
  const { supabase } = await requireUser();
  const { data } = await supabase.from("checklist_templates").select("*").order("name");
  return <ChecklistsView templates={(data ?? []) as ChecklistTemplate[]} />;
}
