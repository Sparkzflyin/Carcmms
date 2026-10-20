"use client";

import { Search, X } from "lucide-react";
import Form from "next/form";
import Link from "next/link";
import { Button, Input, Select } from "@/components/ui";

export function ArchiveSearchForm({
  q,
  vehicle,
  sort,
  vehicles,
}: {
  q: string;
  vehicle: string;
  sort: string;
  vehicles: { id: string; label: string }[];
}) {
  const filtered = q || vehicle;
  return (
    <Form action="/work-orders/archive" className="flex flex-col gap-2 sm:flex-row" role="search">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-3" />
        <Input
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Search title, WO number, parts, notes…"
          aria-label="Search archived work orders"
          className="pl-9"
        />
      </div>
      <Select
        name="vehicle"
        defaultValue={vehicle}
        aria-label="Vehicle"
        className="sm:w-56"
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
      >
        <option value="">All vehicles</option>
        {vehicles.map((v) => (
          <option key={v.id} value={v.id}>{v.label}</option>
        ))}
      </Select>
      <Select
        name="sort"
        defaultValue={sort}
        aria-label="Sort"
        className="sm:w-48"
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
      >
        <option value="archived">Recently archived</option>
        <option value="completed">Recently completed</option>
        <option value="oldest">Oldest first</option>
      </Select>
      <div className="flex gap-2">
        <Button type="submit" variant="primary" className="flex-1">Search</Button>
        {filtered && (
          <Link href="/work-orders/archive" className="inline-flex h-10 items-center gap-1 rounded-md px-3 text-sm font-semibold text-ink-2 hover:bg-panel-2" aria-label="Clear search">
            <X className="size-4" /> Clear
          </Link>
        )}
      </div>
    </Form>
  );
}
