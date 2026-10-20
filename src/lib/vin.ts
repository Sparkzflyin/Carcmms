import "server-only";
import type { VehicleType } from "./types";

export type DecodedVin = {
  vehicle_type: VehicleType;
  year: number | null;
  make: string;
  model: string;
  trim: string;
  body_style: string;
  engine: string;
  transmission: string;
  drivetrain: string;
  fuel_type: string;
};

const VIN_PATTERN = /^[A-HJ-NPR-Z0-9]{17}$/;

// NHTSA's vPIC returns makes like "HARLEY-DAVIDSON" and "MERCEDES-BENZ".
const KEEP_UPPER = new Set(["BMW", "GMC", "KTM", "MG", "RAM", "MINI", "BRP", "AMC"]);
function titleCase(value: string) {
  return value
    .split(/(\s|-)/)
    .map((part) =>
      KEEP_UPPER.has(part) ? part : part.charAt(0) + part.slice(1).toLowerCase(),
    )
    .join("");
}

function describeEngine(r: Record<string, string>) {
  const liters = r.DisplacementL ? `${Number(r.DisplacementL).toFixed(1)}L` : "";
  const cc = !liters && r.DisplacementCC ? `${Math.round(Number(r.DisplacementCC))}cc` : "";
  const layout =
    r.EngineConfiguration && r.EngineCylinders
      ? `${r.EngineConfiguration.replace(/-Shaped/i, "").trim()}${r.EngineCylinders}`
      : r.EngineCylinders
        ? `${r.EngineCylinders}-cyl`
        : "";
  const extras = [r.Turbo === "Yes" ? "Turbo" : "", r.OtherEngineInfo ?? ""].filter(Boolean);
  return [liters || cc, layout, ...extras].filter(Boolean).join(" ").slice(0, 120);
}

export async function decodeVin(raw: string): Promise<DecodedVin | { error: string }> {
  const vin = raw.trim().toUpperCase();
  if (!VIN_PATTERN.test(vin)) {
    return { error: "A VIN is 17 letters and numbers (no I, O or Q)." };
  }

  let row: Record<string, string>;
  try {
    const res = await fetch(
      `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValuesExtended/${vin}?format=json`,
      { signal: AbortSignal.timeout(8000) },
    );
    if (!res.ok) throw new Error(String(res.status));
    row = (await res.json()).Results?.[0] ?? {};
  } catch {
    return { error: "The VIN lookup service didn't respond. Try again or fill the fields in by hand." };
  }

  if (!row.Make || !row.Model) {
    return { error: "No match for that VIN. Double-check it, or fill the fields in by hand." };
  }

  return {
    vehicle_type: /MOTORCYCLE/i.test(row.VehicleType ?? "") ? "motorcycle" : "car",
    year: row.ModelYear ? Number(row.ModelYear) : null,
    make: titleCase(row.Make),
    model: row.Model,
    trim: [row.Trim, row.Series].filter(Boolean).join(" ").trim(),
    body_style: row.BodyClass ?? "",
    engine: describeEngine(row),
    transmission: [row.TransmissionSpeeds && `${row.TransmissionSpeeds}-speed`, row.TransmissionStyle]
      .filter(Boolean)
      .join(" "),
    drivetrain: row.DriveType ?? "",
    fuel_type: row.FuelTypePrimary ?? "",
  };
}
