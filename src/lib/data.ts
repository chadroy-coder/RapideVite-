import { createClient } from "@/lib/supabase/server";
import type { Category, Product, ProductVariant } from "@/types/database";

// Shared read helpers used by Server Components across the storefront.
// All reads go through the RLS-protected anon/user session client, so only
// active products/categories are visible to non-staff visitors.

export async function getCategories(): Promise<Category[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("active", true)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

const PRODUCT_SELECT = "*, category:categories(*), variants:product_variants(*)";

export async function getFeaturedProducts(limit = 8) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("active", true)
    .eq("is_draft_product", false)
    .eq("featured", true)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as Product[];
}

export async function getPromotionProducts(limit = 8) {
  const supabase = await createClient();
  // Products land here either because staff manually flagged them
  // (`promotion = true`), or because a variant simply has a discounted
  // price set (previous_price > selling_price). Relying only on the manual
  // flag meant this section stayed empty until someone remembered to flip
  // it per product, so we also pick up real discount pricing automatically.
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("active", true)
    .eq("is_draft_product", false)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  const products = (data ?? []) as unknown as (Product & { variants: ProductVariant[] })[];
  const onPromotion = products.filter(
    (p) =>
      p.promotion ||
      (p.variants ?? []).some((v) => v.previous_price != null && v.previous_price > v.selling_price)
  );
  return onPromotion.slice(0, limit);
}

export async function getCategoriesWithProducts(perCategory = 8) {
  const supabase = await createClient();
  const [{ data: categories, error: catErr }, { data: products, error: prodErr }] = await Promise.all([
    supabase.from("categories").select("*").eq("active", true).order("sort_order", { ascending: true }),
    supabase
      .from("products")
      .select(PRODUCT_SELECT)
      .eq("active", true)
      .eq("is_draft_product", false)
      .order("created_at", { ascending: false }),
  ]);
  if (catErr) throw catErr;
  if (prodErr) throw prodErr;

  const byCategory = new Map<string, (Product & { variants: ProductVariant[] })[]>();
  for (const p of (products ?? []) as unknown as (Product & { variants: ProductVariant[] })[]) {
    if (!p.category_id) continue;
    const list = byCategory.get(p.category_id) ?? [];
    if (list.length < perCategory) list.push(p);
    byCategory.set(p.category_id, list);
  }

  return ((categories ?? []) as Category[])
    .map((c) => ({ category: c, products: byCategory.get(c.id) ?? [] }))
    .filter((entry) => entry.products.length > 0);
}

export async function getRecentProducts(limit = 8) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("active", true)
    .eq("is_draft_product", false)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as Product[];
}

export async function getProductsByCategorySlug(slug: string) {
  const supabase = await createClient();
  const { data: category } = await supabase
    .from("categories")
    .select("*")
    .eq("slug", slug)
    .single();
  if (!category) return { category: null, products: [] as Product[] };

  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("active", true)
    .eq("is_draft_product", false)
    .eq("category_id", category.id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return { category: category as Category, products: (data ?? []) as unknown as Product[] };
}

export async function searchProducts(query: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("active", true)
    .eq("is_draft_product", false)
    .or(`name.ilike.%${query}%,brand.ilike.%${query}%,description.ilike.%${query}%`)
    .limit(60);
  if (error) throw error;
  return (data ?? []) as unknown as Product[];
}

export async function getProductBySlug(slug: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("slug", slug)
    .eq("active", true)
    .eq("is_draft_product", false)
    .single();
  if (error) return null;
  return data as unknown as Product;
}

export async function getDeliveryFee(): Promise<number> {
  const supabase = await createClient();
  const { data } = await supabase.from("delivery_settings").select("standard_delivery_fee").single();
  return data?.standard_delivery_fee ?? 150;
}

export async function getCurrentUserAndProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, profile: null };
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  return { user, profile };
}
