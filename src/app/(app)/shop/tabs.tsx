"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { cx } from "@/components/ui";

const TABS = [
  { href: "/shop", label: "Inventory" },
  { href: "/shop/vendors", label: "Vendors" },
  { href: "/shop/checklists", label: "Checklists" },
];

export function ShopTabs() {
  return (
    <Suspense fallback={<TabList pathname={null} />}>
      <ActiveTabs />
    </Suspense>
  );
}

function ActiveTabs() {
  return <TabList pathname={usePathname()} />;
}

function TabList({ pathname }: { pathname: string | null }) {
  return (
    <nav className="mb-8 flex gap-6 border-b border-line" aria-label="Shop sections">
      {TABS.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={cx(
              "-mb-px border-b-2 pb-2 font-display text-lg font-bold tracking-wide uppercase transition",
              active ? "border-accent text-ink" : "border-transparent text-ink-3 hover:text-ink",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
