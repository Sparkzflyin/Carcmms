import { cacheLife } from "next/cache";

export type Recall = {
  campaign: string;
  component: string;
  summary: string;
  consequence: string;
  remedy: string;
  reported: string | null; // yyyy-mm-dd
  parkIt: boolean;
  parkOutside: boolean;
};

// NHTSA recalls by year/make/model. Public data, so it's cached on the server
// for everyone and refreshed daily.
export async function getRecalls(year: number, make: string, model: string): Promise<Recall[] | null> {
  "use cache";
  cacheLife("days");

  const url = new URL("https://api.nhtsa.gov/recalls/recallsByVehicle");
  url.search = new URLSearchParams({ make, model, modelYear: String(year) }).toString();
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const data = (await res.json()) as { results?: Record<string, string>[] };
    return (data.results ?? []).map((r) => {
      const [d, m, y] = (r.ReportReceivedDate ?? "").split("/");
      return {
        campaign: r.NHTSACampaignNumber,
        component: r.Component ?? "",
        summary: r.Summary ?? "",
        consequence: r.Consequence ?? "",
        remedy: r.Remedy ?? "",
        reported: y && m && d ? `${y}-${m}-${d}` : null,
        parkIt: String(r.parkIt) === "True",
        parkOutside: String(r.parkOutSide) === "True",
      };
    });
  } catch {
    return null;
  }
}
