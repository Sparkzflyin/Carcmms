import { Wrench } from "lucide-react";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden overflow-hidden bg-[#141516] p-12 text-[#ecebe6] lg:flex lg:flex-col lg:justify-between">
        <div className="hazard absolute inset-x-0 top-0 h-2" />
        <div className="flex items-center gap-2 font-display text-2xl font-extrabold tracking-wide uppercase">
          <Wrench className="size-6 text-[#ff6a2b]" strokeWidth={2.5} />
          GarageLog
        </div>
        <div>
          <p className="font-display text-7xl leading-[0.9] font-extrabold uppercase">
            Every bolt.
            <br />
            Every mile.
            <br />
            <span className="text-[#ff6a2b]">On the record.</span>
          </p>
          <p className="mt-6 max-w-md text-lg text-[#a9aaa6]">
            Log your cars and bikes, open work orders, track parts and costs, and let maintenance
            schedules remind you before something breaks.
          </p>
        </div>
        <p className="font-mono text-xs text-[#75787a]">
          WO-0001 · OIL + FILTER · 5,000 MI INTERVAL
        </p>
      </section>
      <section className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-sm">{children}</div>
      </section>
    </main>
  );
}
