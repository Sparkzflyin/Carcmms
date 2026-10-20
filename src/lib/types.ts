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
  purchase_odometer: number | null;
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
  inventory_item_id: string | null;
  vendor_id: string | null;
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

export type VendorKind = "parts" | "online" | "shop" | "dealer" | "other";

export type Vendor = {
  id: string;
  name: string;
  kind: VendorKind;
  website: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
};

export const VENDOR_KIND_LABELS: Record<VendorKind, string> = {
  parts: "Parts store",
  online: "Online",
  shop: "Repair shop",
  dealer: "Dealer",
  other: "Other",
};

export type InventoryItem = {
  id: string;
  name: string;
  part_number: string | null;
  category: string | null;
  quantity: number;
  unit: string;
  min_quantity: number;
  unit_cost: number | null;
  location: string | null;
  vendor_id: string | null;
  notes: string | null;
  updated_at: string;
};

export type ExpenseCategory =
  | "insurance"
  | "registration"
  | "fuel"
  | "parts"
  | "service"
  | "tires"
  | "accessories"
  | "parking"
  | "tolls"
  | "cleaning"
  | "other";

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  insurance: "Insurance",
  registration: "Registration & taxes",
  fuel: "Fuel / charging",
  parts: "Parts",
  service: "Shop service",
  tires: "Tires",
  accessories: "Accessories & mods",
  parking: "Parking & storage",
  tolls: "Tolls",
  cleaning: "Cleaning & detailing",
  other: "Other",
};

export type Expense = {
  id: string;
  vehicle_id: string;
  date: string;
  category: ExpenseCategory;
  amount: number;
  odometer: number | null;
  vendor_id: string | null;
  description: string | null;
};

export type ChecklistTemplate = {
  id: string;
  name: string;
  description: string | null;
  applies_to: "all" | VehicleType;
  steps: string[];
  tools: string[];
};

export type ChecklistItem = {
  id: string;
  work_order_id: string;
  kind: "step" | "tool";
  text: string;
  done: boolean;
  sort_order: number;
};
