import type { OdometerUnit, Vehicle } from "./types";

const UNIT_LABEL: Record<OdometerUnit, string> = { mi: "mi", km: "km", hr: "hrs" };

export function formatOdometer(value: number | null | undefined, unit: OdometerUnit) {
  if (value == null) return "—";
  return `${value.toLocaleString("en-US")} ${UNIT_LABEL[unit]}`;
}

export function unitLabel(unit: OdometerUnit) {
  return UNIT_LABEL[unit];
}

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
export function formatMoney(value: number) {
  return currency.format(value);
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  // Plain dates ("2026-10-20") are calendar days; don't shift them by timezone.
  const date = value.length === 10 ? new Date(`${value}T00:00:00`) : new Date(value);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function vehicleName(v: Pick<Vehicle, "year" | "make" | "model">) {
  return [v.year, v.make, v.model].filter(Boolean).join(" ");
}

export function workOrderNumber(n: number) {
  return `WO-${String(n).padStart(4, "0")}`;
}
