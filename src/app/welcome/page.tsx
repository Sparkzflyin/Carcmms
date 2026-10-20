import {
  CalendarClock,
  ClipboardList,
  FileText,
  Gauge,
  Package,
  ScanLine,
  ShieldAlert,
  Wallet,
  Wrench,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { buttonClass } from "@/components/ui";

export const metadata: Metadata = {
  title: "GarageLog: maintenance tracking for your cars and motorcycles",
};

const FEATURES = [
  {
    icon: ClipboardList,
    title: "Work orders",
    body: "Open a ticket for every job. Track status, parts, labor and photos from first symptom to torque spec.",
  },
  {
    icon: CalendarClock,
    title: "Maintenance that remembers",
    body: "Set intervals by miles, months or engine hours. When service comes due, the work order opens itself.",
  },
  {
    icon: ScanLine,
    title: "VIN decode",
    body: "Paste a VIN and the year, make, model, engine and drivetrain fill in from the NHTSA database.",
  },
  {
    icon: ShieldAlert,
    title: "Recalls and trouble codes",
    body: "See open safety recalls for each vehicle and look up OBD-II check-engine codes in plain English.",
  },
  {
    icon: Package,
    title: "Parts on the shelf",
    body: "Keep an inventory of filters and fluids. Parts come off the shelf as you use them, with low-stock alerts.",
  },
  {
    icon: Wallet,
    title: "True cost of ownership",
    body: "Insurance, registration, tires and every repair, rolled up into cost per mile.",
  },
  {
    icon: FileText,
    title: "Printable service history",
    body: "Hand a buyer a clean, dated record of every job. Well-kept cars sell for more.",
  },
  {
    icon: Gauge,
    title: "Cars and motorcycles",
    body: "Miles, kilometers or engine hours. Custom fields for anything else you want to track.",
  },
];

export default function WelcomePage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-line">
        <div className="hazard h-1" />
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <span className="flex items-center gap-2 font-display text-xl font-extrabold tracking-wide uppercase">
            <Wrench className="size-5 text-accent" strokeWidth={2.5} /> GarageLog
          </span>
          <nav className="flex items-center gap-2">
            <Link href="/login" className={buttonClass("ghost", "sm")}>
              Sign in
            </Link>
            <Link href="/signup" className={buttonClass("primary", "sm")}>
              Get started
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.2fr_1fr] lg:py-24">
          <div className="rise">
            <p className="mb-4 font-mono text-xs tracking-widest text-accent uppercase">
              A maintenance system for your garage
            </p>
            <h1 className="font-display text-6xl leading-[0.9] font-extrabold uppercase sm:text-7xl lg:text-8xl">
              Every bolt.
              <br />
              Every mile.
              <br />
              <span className="text-accent">On the record.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-ink-2">
              Log your cars and motorcycles, open work orders for what needs fixing, and let
              maintenance schedules tell you what&apos;s due, before something breaks.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/signup" className={buttonClass("primary") + " h-12 px-6 text-base"}>
                Open your garage, free
              </Link>
              <Link href="/login" className={buttonClass("secondary") + " h-12 px-6 text-base"}>
                Sign in
              </Link>
            </div>
          </div>

          {/* A sample work order, styled like the real thing. */}
          <div className="rise relative" style={{ ["--i" as string]: 3 }} aria-hidden>
            <div className="absolute -inset-4 -z-10 rotate-2 rounded-2xl border border-line bg-panel-2" />
            <div className="flex overflow-hidden rounded-lg border border-line bg-panel shadow-card">
              <div className="hazard w-2 shrink-0" />
              <div className="flex w-24 shrink-0 flex-col items-center justify-center gap-2 border-r border-dashed border-line-strong bg-panel-2">
                <span className="size-3 rounded-full border border-line-strong bg-bg" />
                <span className="font-mono text-xs font-bold text-ink-2">WO-0042</span>
              </div>
              <div className="flex-1 p-5">
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-sm border border-accent/30 bg-accent-soft px-2 py-0.5 font-display text-xs font-bold tracking-wider text-accent uppercase">
                    In progress
                  </span>
                  <span className="rounded-sm border border-danger/30 bg-danger-soft px-2 py-0.5 font-display text-xs font-bold tracking-wider text-danger uppercase">
                    Critical
                  </span>
                </div>
                <p className="mt-3 font-display text-2xl font-bold uppercase">
                  Front brake pads + rotors
                </p>
                <p className="text-sm text-ink-3">2019 Toyota Tacoma · 61,240 mi</p>
                <ul className="mt-4 space-y-1.5 text-sm">
                  {[
                    ["Pads, ceramic", "Received", "text-info"],
                    ["Rotors ×2", "Ordered", "text-warn"],
                    ["Brake fluid DOT 3", "In stock", "text-ok"],
                  ].map(([part, status, color]) => (
                    <li
                      key={part}
                      className="flex justify-between gap-4 border-b border-line pb-1.5"
                    >
                      <span>{part}</span>
                      <span
                        className={`font-display text-xs font-bold tracking-wider uppercase ${color}`}
                      >
                        {status}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-right font-mono text-lg font-bold">$286.40</p>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-line bg-panel">
          <div className="mx-auto grid max-w-6xl gap-px bg-line sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(({ icon: Icon, title, body }, i) => (
              <div key={title} className="rise bg-panel p-6" style={{ ["--i" as string]: i }}>
                <Icon className="mb-3 size-6 text-accent" strokeWidth={1.75} />
                <h2 className="font-display text-xl font-bold tracking-wide uppercase">{title}</h2>
                <p className="mt-1 text-sm text-ink-2">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-20 text-center sm:px-6">
          <h2 className="font-display text-5xl font-extrabold uppercase">
            Your garage, organized.
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-ink-2">
            Free to start. Add your first vehicle in under a minute.
          </p>
          <Link href="/signup" className={buttonClass("primary") + " mt-8 h-12 px-8 text-base"}>
            Create your account
          </Link>
        </section>
      </main>

      <footer className="border-t border-line py-6 text-center font-mono text-xs text-ink-3">
        GarageLog · Vehicle data from NHTSA
      </footer>
    </div>
  );
}
