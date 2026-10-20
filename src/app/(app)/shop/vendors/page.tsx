import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import type { Vendor } from "@/lib/types";
import { VendorsView } from "./vendors-view";

export const metadata: Metadata = { title: "Vendors" };

export default function VendorsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <Vendors />
    </Suspense>
  );
}

async function Vendors() {
  const { supabase } = await requireUser();
  const [vendors, parts, items] = await Promise.all([
    supabase.from("vendors").select("*").order("name"),
    supabase
      .from("work_order_parts")
      .select("vendor_id, quantity, unit_cost")
      .not("vendor_id", "is", null),
    supabase.from("inventory_items").select("vendor_id").not("vendor_id", "is", null),
  ]);

  // Spend and usage per vendor, for the cards.
  const stats = new Map<string, { spent: number; parts: number; stocked: number }>();
  const get = (id: string) =>
    stats.get(id) ?? stats.set(id, { spent: 0, parts: 0, stocked: 0 }).get(id)!;
  for (const p of parts.data ?? []) {
    const s = get(p.vendor_id);
    s.parts += 1;
    s.spent += Number(p.quantity) * Number(p.unit_cost);
  }
  for (const i of items.data ?? []) get(i.vendor_id).stocked += 1;

  return (
    <VendorsView vendors={(vendors.data ?? []) as Vendor[]} stats={Object.fromEntries(stats)} />
  );
}
