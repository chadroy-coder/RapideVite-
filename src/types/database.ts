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

export type PaymentMethod = "cash_on_delivery" | "moncash" | "natcash" | "card";
export type PaymentStatus = "pending" | "authorized" | "paid" | "failed" | "refunded";

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
  department: string;
  commune: string;
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
  department: string;
  commune: string;
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
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
}

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
  card: "Carte bancaire",
};
