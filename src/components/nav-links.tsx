"use client";

import clsx from "clsx";
import { CalendarDays, ClipboardList, Package, ScanSearch, Warehouse } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";

const LINKS = [
  {
    href: "/",
    label: "Garage",
    icon: Warehouse,
    match: (p: string) => p === "/" || p.startsWith("/vehicles"),
  },
  {
    href: "/work-orders",
    label: "Work orders",
    short: "Orders",
    icon: ClipboardList,
    match: (p: string) => p.startsWith("/work-orders"),
  },
  {
    href: "/calendar",
    label: "Calendar",
    icon: CalendarDays,
    match: (p: string) => p.startsWith("/calendar"),
  },
  { href: "/shop", label: "Shop", icon: Package, match: (p: string) => p.startsWith("/shop") },
  {
    href: "/codes",
    label: "Codes",
    icon: ScanSearch,
    match: (p: string) => p.startsWith("/codes"),
  },
];

type Variant = "top" | "bottom";

// The active pathname is only known at request time, so the static shell
// renders the links without a highlight and the active state streams in.
export function NavLinks({ variant }: { variant: Variant }) {
  return (
    <Suspense fallback={<LinkList pathname={null} variant={variant} />}>
      <ActiveNavLinks variant={variant} />
    </Suspense>
  );
}

function ActiveNavLinks({ variant }: { variant: Variant }) {
  return <LinkList pathname={usePathname()} variant={variant} />;
}

function LinkList({ pathname, variant }: { pathname: string | null; variant: Variant }) {
  if (variant === "bottom") {
    return (
      <nav className="grid grid-cols-5" aria-label="Main">
        {LINKS.map((link) => {
          const active = pathname != null && link.match(pathname);
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={clsx(
                "relative flex flex-col items-center gap-0.5 pt-2 pb-1.5 font-display text-[11px] font-bold tracking-wider uppercase",
                active ? "text-accent" : "text-ink-3",
              )}
            >
              {active && <span className="absolute inset-x-4 top-0 h-0.5 bg-accent" />}
              <Icon className="size-5" strokeWidth={active ? 2.25 : 1.75} />
              {link.short ?? link.label}
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav className="flex items-center gap-1" aria-label="Main">
      {LINKS.map((link) => {
        const active = pathname != null && link.match(pathname);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={clsx(
              "relative px-3 py-1.5 font-display text-[15px] font-bold tracking-wider uppercase transition",
              active ? "text-ink" : "text-ink-3 hover:text-ink",
            )}
          >
            {link.label}
            {active && <span className="absolute inset-x-3 -bottom-[11px] h-0.5 bg-accent" />}
          </Link>
        );
      })}
    </nav>
  );
}
