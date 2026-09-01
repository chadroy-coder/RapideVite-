// Core domain types mirroring the Supabase schema (supabase/migrations/0001_init.sql)

export type UserRole = "customer" | "staff" | "admin";

export type OrderStatus =
  | "new"
  | "confirmed"
  | "preparing"
  | "ready"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

// Statuses where the order is still actively moving toward the customer -
// used to decide when to show a "you have an order in progress" indicator
// (account page live-orders section, bottom nav badge).
export const LIVE_ORDER_STATUSES: OrderStatus[] = ["new", "confirmed", "preparing", "ready", "out_for_delivery"];

export type PaymentMethod = "cash_on_delivery" | "moncash" | "natcash" | "sogebank" | "card";
export type PaymentStatus = "pending" | "authorized" | "paid" | "failed" | "refunded";

export type SubscriptionStatus = "active" | "past_due" | "canceled" | "inactive";

export interface Subscription {
  id: string;
  user_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  status: SubscriptionStatus;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
}

export const SUBSCRIPTION_PRICE_USD = 30;

export interface Profile {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  size: string | null;
  unit: string | null;
  sku: string | null;
  barcode: string | null;
  selling_price: number;
  previous_price: number | null;
  cost_price: number | null;
  inventory_quantity: number;
  low_stock_threshold: number;
  in_stock: boolean;
  is_default: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export type ImageQualityStatus = "approved" | "needs_replacement" | "missing";

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  brand: string | null;
  category_id: string | null;
  subcategory: string | null;
  image_url: string | null;
  additional_images: string[];
  featured: boolean;
  promotion: boolean;
  active: boolean;
  is_draft_product: boolean;
  image_quality_status: ImageQualityStatus;
  created_at: string;
  updated_at: string;
  category?: Category | null;
  variants?: ProductVariant[];
}

export interface Driver {
  id: string;
  name: string;
  phone: string | null;
  photo_url: string | null;
  active: boolean;
  created_at: string;
}

export interface Address {
  id: string;
  user_id: string;
  label: string | null;
  // Kept nullable for backward compat with rows saved before department/
  // commune was dropped from the address form - new rows won't set these.
  department: string | null;
  commune: string | null;
  neighborhood: string | null;
  street: string;
  delivery_instructions: string | null;
  is_default: boolean;
  created_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  user_id: string | null;
  customer_name: string;
  customer_phone: string;
  department: string | null;
  commune: string | null;
  neighborhood: string | null;
  street: string;
  delivery_instructions: string | null;
  subtotal: number;
  delivery_fee: number;
  discount: number;
  total: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  status: OrderStatus;
  assigned_delivery_person: string | null;
  estimated_delivery_time: string | null;
  driver_photo_url: string | null;
  stripe_checkout_session_id?: string | null;
  stripe_payment_intent_id?: string | null;
  // Storage path of the customer-uploaded MonCash/NatCash/Sogebank transfer
  // screenshot, set after order creation via uploadPaymentProof(). Null for
  // card and cash_on_delivery orders.
  payment_proof_url?: string | null;
  // Magic-link token for the driver/picker page (/livreur/[token]) - the
  // only "auth" that page has. Never expose this to the customer.
  driver_access_token?: string;
  driver_lat?: number | null;
  driver_lng?: number | null;
  driver_location_updated_at?: string | null;
  // One-time pin the customer optionally shares at checkout ("share your
  // location so the driver can find you") - separate from driver_lat/lng
  // above, which is the driver's own continuously-updating position.
  customer_lat?: number | null;
  customer_lng?: number | null;
  customer_location_shared_at?: string | null;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
}

export type ItemFulfillmentStatus = "pending" | "found" | "unavailable" | "substituted" | "refunded";
export type SubstituteStatus = "proposed" | "accepted" | "declined" | "auto_applied";

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  variant_id: string | null;
  product_name: string;
  variant_label: string | null;
  unit_price: number;
  quantity: number;
  line_total: number;
  fulfillment_status: ItemFulfillmentStatus;
  substitute_product_id?: string | null;
  substitute_variant_id?: string | null;
  substitute_status?: SubstituteStatus | null;
  substitute_proposed_at?: string | null;
  // Joined in when a substitute has been proposed/applied, so the UI can
  // show its name/price without a second round trip.
  substitute_product?: { name: string; image_url: string | null } | null;
  // Joined in via getMyOrders()/getOrderById() for order-row thumbnails.
  // Null if the product was deleted after the order was placed.
  product?: { image_url: string | null } | null;
}

export const HAITI_DEPARTMENTS = [
  "Ouest",
  "Nord",
  "Nord-Est",
  "Nord-Ouest",
  "Artibonite",
  "Centre",
  "Sud",
  "Sud-Est",
  "Grand'Anse",
  "Nippes",
] as const;

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  new: "Nouvelle",
  confirmed: "Confirmee",
  preparing: "En preparation",
  ready: "Prete",
  out_for_delivery: "En livraison",
  delivered: "Livree",
  cancelled: "Annulee",
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash_on_delivery: "Paiement a la livraison",
  moncash: "MonCash",
  natcash: "NatCash",
  sogebank: "Sogebank (virement)",
  card: "Carte bancaire",
};

// Methods where the customer sends money manually and must upload a
// screenshot of the transaction as proof before the order is confirmed.
export const PROOF_REQUIRED_PAYMENT_METHODS: PaymentMethod[] = ["moncash", "natcash", "sogebank"];

// ---------- Woulib (ride + package delivery) ----------
// Uses the same driver roster (Driver, above) as grocery orders - see
// supabase/migrations/0019_woulib.sql for the full reasoning.

export type WoulibServiceType = "ride" | "package";
export type WoulibVehicleKind = "car" | "moto";

export type WoulibStatus =
  | "requested"
  | "accepted"
  | "en_route_pickup"
  | "picked_up"
  | "en_route_dropoff"
  | "completed"
  | "cancelled";

export const WOULIB_LIVE_STATUSES: WoulibStatus[] = [
  "requested",
  "accepted",
  "en_route_pickup",
  "picked_up",
  "en_route_dropoff",
];

export const WOULIB_STATUS_LABELS: Record<WoulibStatus, string> = {
  requested: "Demande envoyee",
  accepted: "Chauffeur assigne",
  en_route_pickup: "En route vers le depart",
  picked_up: "Recupere",
  en_route_dropoff: "En route vers l'arrivee",
  completed: "Termine",
  cancelled: "Annule",
};

export interface WoulibVehicleType {
  id: string;
  name: string;
  kind: WoulibVehicleKind;
  base_fare: number;
  price_per_km: number;
  price_per_minute: number;
  active: boolean;
  sort_order: number;
  created_at: string;
}

export interface WoulibRequest {
  id: string;
  request_number: string;
  user_id: string;
  service_type: WoulibServiceType;
  vehicle_type_id: string;
  pickup_lat: number;
  pickup_lng: number;
  pickup_address: string | null;
  dropoff_lat: number;
  dropoff_lng: number;
  dropoff_address: string | null;
  contact_name: string;
  contact_phone: string;
  package_description: string | null;
  notes: string | null;
  distance_km: number | null;
  duration_minutes: number | null;
  estimated_price: number | null;
  final_price: number | null;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  payment_proof_url: string | null;
  status: WoulibStatus;
  assigned_driver_id: string | null;
  driver_access_token?: string;
  driver_lat: number | null;
  driver_lng: number | null;
  driver_location_updated_at: string | null;
  created_at: string;
  updated_at: string;
  vehicle_type?: WoulibVehicleType | null;
  driver?: { name: string; phone: string | null; photo_url: string | null } | null;
}
