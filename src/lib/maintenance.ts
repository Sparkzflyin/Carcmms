import type { MaintenanceSchedule } from "./types";

export type MaintenanceState = {
  status: "ok" | "soon" | "due";
  // Remaining distance (negative = overdue) and remaining days, when relevant.
  distanceLeft: number | null;
  daysLeft: number | null;
};

const SOON_FRACTION = 0.1;
const SOON_DAYS = 30;

export function maintenanceState(
  schedule: MaintenanceSchedule,
  currentOdometer: number,
  today: Date,
): MaintenanceState {
  let distanceLeft: number | null = null;
  let daysLeft: number | null = null;
  let status: MaintenanceState["status"] = "ok";

  if (schedule.interval_distance) {
    const next = (schedule.last_done_odometer ?? 0) + schedule.interval_distance;
    distanceLeft = next - currentOdometer;
    if (distanceLeft <= 0) status = "due";
    else if (distanceLeft <= schedule.interval_distance * SOON_FRACTION) status = "soon";
  }

  if (schedule.interval_months) {
    const base = new Date(`${schedule.last_done_date ?? schedule.created_at.slice(0, 10)}T00:00:00`);
    const next = new Date(base);
    next.setMonth(next.getMonth() + schedule.interval_months);
    daysLeft = Math.ceil((next.getTime() - today.getTime()) / 86_400_000);
    if (daysLeft <= 0) status = "due";
    else if (daysLeft <= SOON_DAYS && status !== "due") status = "soon";
  }

  return { status, distanceLeft, daysLeft };
}
