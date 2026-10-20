import { ExternalLink, ScanSearch } from "lucide-react";
import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { Suspense } from "react";
import { Button, Card, Input, PageHeader, SectionTitle, Skeleton } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { vehicleName } from "@/lib/format";
import { COMMON_CODES, lookupCode, normalizeCode } from "@/lib/obd-codes";
import type { Vehicle } from "@/lib/types";
import { OpenWorkOrderForCode } from "./open-work-order";

export const metadata: Metadata = { title: "Trouble codes" };

export default function CodesPage({ searchParams }: PageProps<"/codes">) {
  return (
    <>
      <PageHeader eyebrow="OBD-II diagnostic trouble codes" title="Code lookup" />
      <Suspense fallback={<Skeleton className="h-64" />}>
        <CodeLookup searchParams={searchParams} />
      </Suspense>
      <section className="mt-12">
        <SectionTitle>Common codes</SectionTitle>
        <div className="grid gap-2 sm:grid-cols-2">
          {COMMON_CODES.map((c) => (
            <Link
              key={c.code}
              href={`/codes?code=${c.code}`}
              className="flex items-baseline gap-3 rounded-md border border-line bg-panel px-3 py-2 hover:border-accent"
            >
              <span className="font-mono font-bold text-accent">{c.code}</span>
              <span className="truncate text-sm text-ink-2">{c.description}</span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}

async function CodeLookup({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const raw = (Array.isArray(sp.code) ? sp.code[0] : sp.code) ?? "";
  const info = raw ? lookupCode(raw) : null;
  const code = normalizeCode(raw);

  const { supabase } = await requireUser();
  const { data } = info
    ? await supabase
        .from("vehicles")
        .select("id, year, make, model, nickname")
        .eq("archived", false)
        .order("created_at")
    : { data: null };
  const vehicles = (
    (data ?? []) as Pick<Vehicle, "id" | "year" | "make" | "model" | "nickname">[]
  ).map((v) => ({
    id: v.id,
    label: v.nickname ?? vehicleName(v),
  }));

  return (
    <>
      <Form action="/codes" className="flex max-w-xl gap-2" role="search">
        <div className="relative flex-1">
          <ScanSearch className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-ink-3" />
          <Input
            name="code"
            defaultValue={raw}
            placeholder="P0420"
            aria-label="Trouble code"
            autoCapitalize="characters"
            autoComplete="off"
            className="h-12 pl-10 font-mono text-xl tracking-widest uppercase"
          />
        </div>
        <Button type="submit" variant="primary" className="h-12 px-6">
          Look up
        </Button>
      </Form>

      {raw && !info && (
        <p className="mt-4 text-sm text-danger">
          &ldquo;{raw}&rdquo; isn&apos;t a valid code. Codes look like P0420: a letter (P, B, C or
          U) then four characters.
        </p>
      )}

      {info && (
        <Card className="rise mt-6 overflow-hidden">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-line bg-panel-2 px-5 py-4">
            <span className="font-mono text-4xl font-bold text-accent">{info.code}</span>
            <span className="font-display text-sm font-bold tracking-widest text-ink-3 uppercase">
              {info.generic ? "Generic code" : "Manufacturer-specific code"}
            </span>
          </div>
          <div className="flex flex-col gap-4 px-5 py-4">
            {info.description ? (
              <p className="font-display text-2xl leading-tight font-bold uppercase">
                {info.description}
              </p>
            ) : info.generic ? (
              <p className="text-ink-2">
                This is a standard code, but it isn&apos;t in our quick-reference list. Use the
                search link below for its definition.
              </p>
            ) : (
              <p className="text-ink-2">
                Manufacturer codes mean different things on different brands. Look it up for your
                specific make, or check a scan tool that reads enhanced codes.
              </p>
            )}
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs text-ink-3">System</dt>
                <dd>{info.system}</dd>
              </div>
              {info.subsystem && (
                <div>
                  <dt className="text-xs text-ink-3">Area</dt>
                  <dd>{info.subsystem}</dd>
                </div>
              )}
            </dl>
            {info.causes && (
              <div>
                <p className="mb-1 font-display text-xs font-bold tracking-widest text-ink-3 uppercase">
                  Common causes
                </p>
                <ul className="list-disc space-y-0.5 pl-5 text-sm">
                  {info.causes.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-ink-3">
                  A starting point, not a diagnosis. Check freeze-frame data and any other codes
                  stored with it.
                </p>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
              <a
                href={`https://www.google.com/search?q=${encodeURIComponent(`${info.code} code`)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:underline"
              >
                <ExternalLink className="size-4" /> Search for {info.code}
              </a>
              {vehicles.length > 0 && (
                <OpenWorkOrderForCode
                  code={code}
                  description={info.description}
                  vehicles={vehicles}
                />
              )}
            </div>
          </div>
        </Card>
      )}
    </>
  );
}
