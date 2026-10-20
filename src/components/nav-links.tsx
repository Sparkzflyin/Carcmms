"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";

const LINKS = [
  { href: "/", label: "Garage", match: (p: string) => p === "/" || p.startsWith("/vehicles") },
  { href: "/work-orders", label: "Work orders", match: (p: string) => p.startsWith("/work-orders") },
  { href: "/settings", label: "Settings", match: (p: string) => p.startsWith("/settings") },
];

// The active pathname is only known at request time, so the static shell
// renders the links without a highlight and the active state streams in.
export function NavLinks() {
  return (
    <Suspense fallback={<LinkList pathname={null} />}>
      <ActiveNavLinks />
    </Suspense>
  );
}

function ActiveNavLinks() {
  return <LinkList pathname={usePathname()} />;
}

function LinkList({ pathname }: { pathname: string | null }) {
  return (
    <nav className="flex items-center gap-1">
      {LINKS.map((link) => {
        const active = pathname != null && link.match(pathname);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={clsx(
              "relative px-2.5 py-1.5 font-display text-[15px] font-bold tracking-wider uppercase transition sm:px-3",
              active ? "text-ink" : "text-ink-3 hover:text-ink",
            )}
          >
            {link.label}
            {active && <span className="absolute inset-x-2.5 -bottom-[11px] h-0.5 bg-accent sm:inset-x-3" />}
          </Link>
        );
      })}
    </nav>
  );
}
