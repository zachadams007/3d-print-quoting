export type RequestStatus =
  | "submitted"
  | "in_queue"
  | "awaiting_contact"
  | "awaiting_approval"
  | "awaiting_payment"
  | "printing"
  | "ready"
  | "picked_up"
  | "cancelled";

export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  submitted: "Submitted",
  in_queue: "In Queue",
  awaiting_contact: "Awaiting Contact",
  awaiting_approval: "Awaiting Approval",
  awaiting_payment: "Awaiting Payment",
  printing: "Printing",
  ready: "Ready for Pickup",
  picked_up: "Picked Up",
  cancelled: "Cancelled",
};

export const STATUS_PIPELINE: RequestStatus[] = [
  "submitted",
  "in_queue",
  "awaiting_contact",
  "awaiting_approval",
  "awaiting_payment",
  "printing",
  "ready",
  "picked_up",
];

export type QualityPreset = "0.28" | "0.20" | "0.12";
export type InfillPreset = "15" | "25" | "40";

export const QUALITY_LABELS: Record<QualityPreset, string> = {
  "0.28": "Draft (0.28mm)",
  "0.20": "Standard (0.20mm)",
  "0.12": "Fine (0.12mm)",
};

export const INFILL_LABELS: Record<InfillPreset, string> = {
  "15": "15%",
  "25": "25%",
  "40": "40%",
};

export interface Material {
  id: string;
  name: string;
  in_stock: boolean;
  density_g_cm3: number;
  price_per_gram: number;
  price_per_gram_slope: number;
  time_multiplier: number;
}

export interface Color {
  id: string;
  name: string;
  hex_code: string | null;
  in_stock: boolean;
  price_multiplier: number;
}

export interface MaterialColor {
  material_id: string;
  color_id: string;
}

export interface Settings {
  id: string;
  contact_instructions: string;
  disclaimer_text: string;
  printing_hours_per_day: number;
  buffer_hours_per_job: number;
  base_hours_per_cm3: number;
  overhead_hours: number;
  waste_factor: number;
  minimum_price: number;
  time_rate_per_hour: number;
  rush_multiplier: number;
  setup_fee_standard: number;
  setup_fee_special: number;
  supports_fee: number;
  quality_multipliers: Record<QualityPreset, number>;
  infill_multipliers: Record<InfillPreset, number>;
}

export type RequestSource = "upload" | "store";

export type AvailabilityState = "in_stock" | "made_to_order" | "request_only";

export const AVAILABILITY_LABELS: Record<AvailabilityState, string> = {
  in_stock: "In Stock",
  made_to_order: "Made to Order",
  request_only: "Request Only",
};

export const AVAILABILITY_DESCRIPTIONS: Record<AvailabilityState, string> = {
  in_stock: "Printed and ready for pickup",
  made_to_order: "I can print this if you request it",
  request_only: "I'll consider it — may not accept",
};

export interface StoreItem {
  id: string;
  slug: string;
  title: string;
  description_short: string;
  description_long: string;
  base_price: number;
  availability_state: AvailabilityState;
  is_visible: boolean;
  created_at: string;
  images?: StoreItemImage[];
  option_groups?: StoreOptionGroup[];
}

export interface StoreItemImage {
  id: string;
  store_item_id: string;
  storage_path: string;
  sort_order: number;
  alt_text: string | null;
  url?: string;
}

export interface StoreOptionGroup {
  id: string;
  store_item_id: string;
  name: string;
  sort_order: number;
  choices?: StoreOptionChoice[];
}

export interface StoreOptionChoice {
  id: string;
  option_group_id: string;
  label: string;
  price_delta: number;
  sort_order: number;
  is_active: boolean;
}

export interface StoreOptionsSelected {
  [groupId: string]: {
    group_name: string;
    choice_id: string;
    choice_label: string;
    price_delta: number;
  };
}

export interface PrintRequest {
  id: string;
  public_token: string;
  created_at: string;
  customer_name: string;
  customer_email: string;
  customer_snapchat: string | null;
  customer_notes: string | null;
  material_id: string | null;
  quality_preset: QualityPreset;
  infill_preset: InfillPreset;
  supports: boolean;
  rush: boolean;
  estimated_volume_cm3: number | null;
  estimated_grams: number | null;
  estimated_time_hours: number | null;
  estimated_turnaround_days: number | null;
  estimated_price: number | null;
  final_price: number | null;
  status: RequestStatus;
  internal_notes: string | null;
  public_note: string | null;
  manual_estimate_required: boolean;
  color_id: string | null;
  request_source: RequestSource;
  store_item_id: string | null;
  store_options_json: StoreOptionsSelected | null;
  materials?: Material;
  colors?: Color;
  store_items?: Pick<StoreItem, "title" | "slug" | "base_price">;
}

export interface RequestFile {
  id: string;
  request_id: string;
  file_name: string;
  file_ext: string;
  file_size: number;
  storage_path: string;
  volume_cm3: number | null;
}

export interface FileEstimate {
  fileName: string;
  fileExt: string;
  fileSize: number;
  volumeCm3: number | null;
  surfaceAreaMm2: number | null;
  manualRequired: boolean;
  error?: string;
}

export interface Estimate {
  totalVolumeCm3: number;
  grams: number;
  timeHours: number;
  turnaroundDays: number;
  price: number;
  manualRequired: boolean;
  minimumApplied: boolean;
  minimumPrice: number;
}
