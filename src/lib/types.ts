export type VehicleType = "car" | "motorcycle";
export type OdometerUnit = "mi" | "km" | "hr";

export type WorkOrderStatus = "open" | "in_progress" | "waiting_parts" | "done" | "cancelled";
export type WorkOrderPriority = "low" | "medium" | "high" | "critical";
export type PartStatus = "needed" | "ordered" | "received" | "installed";
export type CustomFieldType = "text" | "number" | "date" | "select" | "boolean";

export type CustomFieldDefinition = {
  id: string;
  label: string;
  field_type: CustomFieldType;
  options: string[];
  applies_to: "all" | VehicleType;
  sort_order: number;
};

export type Vehicle = {
  id: string;
  vehicle_type: VehicleType;
  nickname: string | null;
  year: number | null;
  make: string;
  model: string;
  trim: string | null;
  vin: string | null;
  body_style: string | null;
  engine: string | null;
  transmission: string | null;
  drivetrain: string | null;
  fuel_type: string | null;
  color: string | null;
  license_plate: string | null;
  odometer: number;
  odometer_unit: OdometerUnit;
  purchase_date: string | null;
  purchase_price: number | null;
  notes: string | null;
  photo_path: string | null;
  custom_fields: Record<string, string | number | boolean | null>;
  archived: boolean;
  created_at: string;
  updated_at: string;
};

export type WorkOrder = {
  id: string;
  vehicle_id: string;
  maintenance_schedule_id: string | null;
  number: number;
  title: string;
  description: string | null;
  status: WorkOrderStatus;
  priority: WorkOrderPriority;
  odometer: number | null;
  labor_hours: number;
  labor_rate: number;
  due_date: string | null;
  started_at: string | null;
  completed_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type WorkOrderPart = {
  id: string;
  work_order_id: string;
  name: string;
  part_number: string | null;
  vendor: string | null;
  quantity: number;
  unit_cost: number;
  status: PartStatus;
  created_at: string;
};

export type WorkOrderNote = {
  id: string;
  work_order_id: string;
  body: string | null;
  photo_paths: string[];
  kind: "note" | "status";
  created_at: string;
};

export type MaintenanceSchedule = {
  id: string;
  vehicle_id: string;
  title: string;
  description: string | null;
  interval_distance: number | null;
  interval_months: number | null;
  last_done_odometer: number | null;
  last_done_date: string | null;
  active: boolean;
  created_at: string;
};

export const STATUS_LABELS: Record<WorkOrderStatus, string> = {
  open: "Open",
  in_progress: "In progress",
  waiting_parts: "Waiting on parts",
  done: "Done",
  cancelled: "Cancelled",
};

export const PRIORITY_LABELS: Record<WorkOrderPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

export const PART_STATUS_LABELS: Record<PartStatus, string> = {
  needed: "Needed",
  ordered: "Ordered",
  received: "Received",
  installed: "Installed",
};

export const OPEN_STATUSES: WorkOrderStatus[] = ["open", "in_progress", "waiting_parts"];
export const CLOSED_STATUSES: WorkOrderStatus[] = ["done", "cancelled"];
