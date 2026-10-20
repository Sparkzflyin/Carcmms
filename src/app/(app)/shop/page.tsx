import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import type { InventoryItem, Vendor } from "@/lib/types";
import { InventoryView } from "./inventory-view";

export const metadata: Metadata = { title: "Inventory" };

export default function InventoryPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <Inventory />
    </Suspense>
  );
}

async function Inventory() {
  const { supabase } = await requireUser();
  const [items, vendors] = await Promise.all([
    supabase.from("inventory_items").select("*").order("name"),
    supabase.from("vendors").select("id, name, website").order("name"),
  ]);
  return (
    <InventoryView
      items={(items.data ?? []) as InventoryItem[]}
      vendors={(vendors.data ?? []) as Pick<Vendor, "id" | "name" | "website">[]}
    />
  );
}
