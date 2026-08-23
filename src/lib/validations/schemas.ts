import { z } from "zod";

export const addressSchema = z.object({
  label: z.string().min(1).max(50).default("Home"),
  neighborhood: z.string().max(120).optional().or(z.literal("")),
  street: z.string().min(3, "L'adresse est requise"),
  delivery_instructions: z.string().max(500).optional().or(z.literal("")),
  is_default: z.boolean().optional().default(false),
});
export type AddressInput = z.input<typeof addressSchema>;

export const checkoutSchema = z.object({
  customer_name: z.string().min(2, "Nom requis"),
  customer_phone: z
    .string()
    .min(8, "Numero de telephone invalide")
    .max(20),
  neighborhood: z.string().max(120).optional().or(z.literal("")),
  street: z.string().min(3, "Adresse requise"),
  delivery_instructions: z.string().max(500).optional().or(z.literal("")),
  payment_method: z.enum(["cash_on_delivery", "moncash", "natcash", "sogebank", "card"]),
  save_address: z.boolean().optional().default(false),
});
export type CheckoutInput = z.input<typeof checkoutSchema>;

export const loginSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(6, "Mot de passe trop court"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    full_name: z.string().min(2, "Nom requis"),
    phone: z.string().min(8, "Numero invalide"),
    email: z.string().email("Email invalide"),
    password: z.string().min(6, "Au moins 6 caracteres"),
    confirm_password: z.string().min(6),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirm_password"],
  });
export type RegisterInput = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().email("Email invalide"),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: z.string().min(6, "Au moins 6 caracteres"),
    confirm_password: z.string().min(6),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirm_password"],
  });
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const productSchema = z.object({
  name: z.string().min(2, "Nom requis"),
  slug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug invalide (utilisez des minuscules et tirets)"),
  description: z.string().optional().or(z.literal("")),
  brand: z.string().optional().or(z.literal("")),
  category_id: z.string().uuid("Categorie requise"),
  subcategory: z.string().optional().or(z.literal("")),
  image_url: z.string().optional().or(z.literal("")),
  featured: z.boolean().optional().default(false),
  promotion: z.boolean().optional().default(false),
  active: z.boolean().optional().default(true),
  // default variant fields (v1 keeps 1 variant per product in the admin form;
  // additional variants can be added via the variant sub-form)
  size: z.string().optional().or(z.literal("")),
  unit: z.string().optional().or(z.literal("")),
  sku: z.string().min(1, "SKU requis"),
  barcode: z.string().optional().or(z.literal("")),
  selling_price: z.coerce.number().positive("Le prix doit etre positif"),
  previous_price: z.coerce.number().nonnegative().optional(),
  cost_price: z.coerce.number().nonnegative().optional(),
  inventory_quantity: z.coerce.number().int().nonnegative().default(0),
  low_stock_threshold: z.coerce.number().int().nonnegative().default(5),
});
export type ProductInput = z.input<typeof productSchema>;

export const categorySchema = z.object({
  name: z.string().min(2, "Nom requis"),
  slug: z.string().min(2).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug invalide"),
  description: z.string().optional().or(z.literal("")),
  sort_order: z.coerce.number().int().default(0),
  active: z.boolean().optional().default(true),
});
export type CategoryInput = z.input<typeof categorySchema>;

export const driverSchema = z.object({
  name: z.string().min(2, "Nom requis"),
  phone: z.string().optional().or(z.literal("")),
  photo_url: z.string().optional().or(z.literal("")),
  active: z.boolean().optional().default(true),
});
export type DriverInput = z.input<typeof driverSchema>;

export const orderStatusUpdateSchema = z.object({
  order_id: z.string().uuid(),
  status: z.enum([
    "new",
    "confirmed",
    "preparing",
    "ready",
    "out_for_delivery",
    "delivered",
    "cancelled",
  ]),
  assigned_delivery_person: z.string().optional().or(z.literal("")),
  estimated_delivery_time: z.string().optional().or(z.literal("")),
  driver_photo_url: z.string().optional().or(z.literal("")),
});
export type OrderStatusUpdateInput = z.infer<typeof orderStatusUpdateSchema>;
