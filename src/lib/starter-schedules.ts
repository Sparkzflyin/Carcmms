import type { OdometerUnit, VehicleType } from "./types";

export type StarterSchedule = {
  key: string;
  title: string;
  // Distance in miles (converted for km), or engine hours for hour meters.
  distance: number | null;
  months: number | null;
  note?: string;
  defaultOn: boolean;
};

// General-purpose intervals. Owner's manuals vary, so every one is editable
// before it's added.
const CAR: StarterSchedule[] = [
  {
    key: "oil",
    title: "Engine oil & filter",
    distance: 5000,
    months: 6,
    note: "Synthetic often allows 7,500–10,000 mi.",
    defaultOn: true,
  },
  { key: "rotate", title: "Tire rotation", distance: 6000, months: 6, defaultOn: true },
  { key: "brakes", title: "Brake inspection", distance: 12000, months: 12, defaultOn: true },
  { key: "engine-air", title: "Engine air filter", distance: 15000, months: 24, defaultOn: true },
  { key: "cabin-air", title: "Cabin air filter", distance: 15000, months: 12, defaultOn: true },
  { key: "brake-fluid", title: "Brake fluid flush", distance: null, months: 24, defaultOn: true },
  { key: "wipers", title: "Wiper blades", distance: null, months: 12, defaultOn: false },
  { key: "battery", title: "Battery test", distance: null, months: 12, defaultOn: false },
  {
    key: "coolant",
    title: "Coolant flush",
    distance: 60000,
    months: 60,
    note: "Long-life coolant can go 100,000 mi.",
    defaultOn: false,
  },
  {
    key: "plugs",
    title: "Spark plugs",
    distance: 60000,
    months: null,
    note: "Copper ~30k, iridium up to 100k mi.",
    defaultOn: false,
  },
  { key: "trans", title: "Transmission fluid", distance: 60000, months: null, defaultOn: false },
];

const ELECTRIC_CAR: StarterSchedule[] = [
  { key: "rotate", title: "Tire rotation", distance: 6500, months: 12, defaultOn: true },
  {
    key: "brakes",
    title: "Brake inspection",
    distance: 12500,
    months: 12,
    note: "Regen braking means pads last, but calipers can seize.",
    defaultOn: true,
  },
  { key: "cabin-air", title: "Cabin air filter", distance: null, months: 24, defaultOn: true },
  { key: "brake-fluid", title: "Brake fluid check", distance: null, months: 24, defaultOn: true },
  { key: "wipers", title: "Wiper blades", distance: null, months: 12, defaultOn: false },
  { key: "12v", title: "12V battery check", distance: null, months: 12, defaultOn: false },
];

const MOTORCYCLE: StarterSchedule[] = [
  {
    key: "oil",
    title: "Engine oil & filter",
    distance: 3000,
    months: 12,
    note: "Many bikes allow 4,000–6,000 mi; check the manual.",
    defaultOn: true,
  },
  { key: "chain-lube", title: "Chain clean & lube", distance: 500, months: null, defaultOn: true },
  {
    key: "chain-check",
    title: "Chain slack & wear check",
    distance: 1000,
    months: null,
    defaultOn: true,
  },
  {
    key: "tires",
    title: "Tire pressure & tread check",
    distance: null,
    months: 1,
    defaultOn: true,
  },
  { key: "brake-fluid", title: "Brake fluid flush", distance: null, months: 24, defaultOn: true },
  { key: "air", title: "Air filter", distance: 6000, months: 12, defaultOn: false },
  {
    key: "coolant",
    title: "Coolant flush",
    distance: null,
    months: 24,
    note: "Liquid-cooled bikes only.",
    defaultOn: false,
  },
  { key: "plugs", title: "Spark plugs", distance: 8000, months: null, defaultOn: false },
  {
    key: "valves",
    title: "Valve clearance check",
    distance: 15000,
    months: null,
    note: "Intervals vary a lot by engine (8k–30k mi).",
    defaultOn: false,
  },
  { key: "forks", title: "Fork oil", distance: 15000, months: 24, defaultOn: false },
  { key: "battery", title: "Battery check", distance: null, months: 12, defaultOn: false },
];

// For hour-metered machines (dirt bikes, etc.).
const HOURS: StarterSchedule[] = [
  { key: "oil", title: "Engine oil & filter", distance: 15, months: 12, defaultOn: true },
  { key: "air", title: "Clean air filter", distance: 5, months: null, defaultOn: true },
  { key: "chain-lube", title: "Chain clean & lube", distance: 3, months: null, defaultOn: true },
  { key: "plugs", title: "Spark plug", distance: 50, months: null, defaultOn: false },
  { key: "valves", title: "Valve clearance check", distance: 30, months: null, defaultOn: false },
  { key: "brake-fluid", title: "Brake fluid flush", distance: null, months: 24, defaultOn: false },
];

export function starterSchedules(
  type: VehicleType,
  unit: OdometerUnit,
  fuelType: string | null,
): StarterSchedule[] {
  if (unit === "hr") return HOURS;
  const base =
    type === "motorcycle"
      ? MOTORCYCLE
      : /electric/i.test(fuelType ?? "") && !/hybrid/i.test(fuelType ?? "")
        ? ELECTRIC_CAR
        : CAR;
  if (unit === "mi") return base;
  // Kilometers: convert and round to a tidy number.
  return base.map((s) => ({
    ...s,
    distance: s.distance == null ? null : Math.round((s.distance * 1.609) / 500) * 500 || 500,
  }));
}
