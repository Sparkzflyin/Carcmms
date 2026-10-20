import { ExternalLink, ShieldAlert, ShieldCheck } from "lucide-react";
import { Card, SectionTitle } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { getRecalls } from "@/lib/recalls";
import type { Vehicle } from "@/lib/types";
import { RecallHandledButton } from "./recall-button";

export async function Recalls({
  vehicle,
}: {
  vehicle: Pick<Vehicle, "id" | "year" | "make" | "model" | "vin">;
}) {
  const checkByVin = (
    <a
      href={
        vehicle.vin
          ? `https://www.nhtsa.gov/recalls?vin=${vehicle.vin}`
          : "https://www.nhtsa.gov/recalls"
      }
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 text-sm font-semibold text-accent hover:underline"
    >
      Check by VIN at NHTSA <ExternalLink className="size-3.5" />
    </a>
  );

  if (!vehicle.year) {
    return (
      <section>
        <SectionTitle>Safety recalls</SectionTitle>
        <p className="text-sm text-ink-3">Add the model year to check for recalls. {checkByVin}</p>
      </section>
    );
  }

  const [recalls, { supabase }] = await Promise.all([
    getRecalls(vehicle.year, vehicle.make, vehicle.model),
    requireUser(),
  ]);
  const { data } = await supabase
    .from("recall_dismissals")
    .select("campaign")
    .eq("vehicle_id", vehicle.id);
  const handled = new Set((data ?? []).map((d) => d.campaign as string));
  const open = (recalls ?? []).filter((r) => !handled.has(r.campaign));
  const done = (recalls ?? []).filter((r) => handled.has(r.campaign));

  return (
    <section>
      <SectionTitle action={checkByVin}>
        Safety recalls{" "}
        {recalls && (
          <span
            className={
              open.length
                ? "ml-1 font-mono text-base text-danger"
                : "ml-1 font-mono text-base text-ink-3"
            }
          >
            {open.length}
          </span>
        )}
      </SectionTitle>
      {recalls == null ? (
        <p className="text-sm text-ink-3">
          NHTSA&apos;s recall service didn&apos;t respond. Try again later.
        </p>
      ) : recalls.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-ok">
          <ShieldCheck className="size-4" /> No recalls on file for a {vehicle.year} {vehicle.make}{" "}
          {vehicle.model}.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {open.length === 0 && (
            <p className="flex items-center gap-2 text-sm text-ok">
              <ShieldCheck className="size-4" /> All {recalls.length} recalls marked as handled.
            </p>
          )}
          {open.map((r) => (
            <Card key={r.campaign} className="overflow-hidden border-danger/40">
              {(r.parkIt || r.parkOutside) && (
                <p className="bg-danger px-4 py-1.5 font-display text-sm font-bold tracking-wider text-white uppercase">
                  {r.parkIt
                    ? "Do not drive: park it until repaired"
                    : "Park outside, away from structures"}
                </p>
              )}
              <details className="group px-4 py-3">
                <summary className="flex cursor-pointer list-none items-start gap-3">
                  <ShieldAlert className="mt-0.5 size-5 shrink-0 text-danger" />
                  <span className="flex-1">
                    <span className="block font-semibold">{r.component.replace(/:/g, " › ")}</span>
                    <span className="font-mono text-xs text-ink-3">
                      {r.campaign}
                      {r.reported && ` · ${formatDate(r.reported)}`}
                    </span>
                  </span>
                  <span className="text-xs font-semibold text-ink-3 group-open:hidden">
                    Details
                  </span>
                </summary>
                <div className="mt-3 space-y-2 pl-8 text-sm text-ink-2">
                  <p>{r.summary}</p>
                  {r.consequence && (
                    <p>
                      <strong className="text-ink">Risk:</strong> {r.consequence}
                    </p>
                  )}
                  {r.remedy && (
                    <p>
                      <strong className="text-ink">Fix:</strong> {r.remedy}
                    </p>
                  )}
                  <p className="text-xs text-ink-3">
                    Recalls can be specific to some VINs. Confirm with a dealer or by VIN.
                  </p>
                  <RecallHandledButton
                    vehicleId={vehicle.id}
                    campaign={r.campaign}
                    handled={false}
                  />
                </div>
              </details>
            </Card>
          ))}
          {done.length > 0 && (
            <details className="text-sm">
              <summary className="cursor-pointer text-ink-3 hover:text-ink">
                {done.length} handled / not applicable
              </summary>
              <ul className="mt-2 space-y-1.5">
                {done.map((r) => (
                  <li
                    key={r.campaign}
                    className="flex items-center justify-between gap-3 rounded-md border border-line px-3 py-2"
                  >
                    <span>
                      <span className="font-mono text-xs text-ink-3">{r.campaign}</span>{" "}
                      {r.component.split(":")[0]}
                    </span>
                    <RecallHandledButton vehicleId={vehicle.id} campaign={r.campaign} handled />
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </section>
  );
}
