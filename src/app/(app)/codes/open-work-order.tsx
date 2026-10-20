"use client";

import { ClipboardPlus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Select, buttonClass } from "@/components/ui";

export function OpenWorkOrderForCode({
  code,
  description,
  vehicles,
}: {
  code: string;
  description: string | null;
  vehicles: { id: string; label: string }[];
}) {
  const [vehicle, setVehicle] = useState(vehicles[0].id);
  const params = new URLSearchParams({
    title: `${code}${description ? `: ${description}` : ""}`.slice(0, 120),
    description: `Check engine light: ${code}${description ? ` (${description})` : ""}.`,
    priority: "high",
  });
  return (
    <div className="ml-auto flex items-center gap-2">
      {vehicles.length > 1 && (
        <Select value={vehicle} onChange={(e) => setVehicle(e.target.value)} className="h-8 w-auto text-sm" aria-label="Vehicle">
          {vehicles.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
        </Select>
      )}
      <Link href={`/vehicles/${vehicle}/work-orders/new?${params}`} className={buttonClass("secondary", "sm")}>
        <ClipboardPlus className="size-4" /> Open work order{vehicles.length === 1 ? ` for ${vehicles[0].label}` : ""}
      </Link>
    </div>
  );
}
