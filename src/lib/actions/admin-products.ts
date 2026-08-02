"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/require-staff";
import { productSchema, type ProductInput } from "@/lib/validations/schemas";
import { createAdminClient } from "@/lib/supabase/admin";

export async function listProductsAdmin(query?: string) {
  const { supabase } = await requireStaff();
  let q = supabase
    .from("products")
    .select("*, category:categories(name), variants:product_variants(*)")
    .order("created_at", { ascending: false });
  if (query) {
    q = q.or(`name.ilike.%${query}%,brand.ilike.%${query}%`);
  }
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function getProductForEdit(id: string) {
  const { supabase } = await requireStaff();
  const { data, error } = await supabase
    .from("products")
    .select("*, variants:product_variants(*)")
    .eq("id", id)
    .single();
  if (error) return null;
  return data;
}

export async function createProduct(input: ProductInput) {
  const { supabase } = await requireStaff();
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Donnees invalides" };
  const d = parsed.data;

  const { data: product, error: productError } = await supabase
    .from("products")
    .insert({
      name: d.name,
      slug: d.slug,
      description: d.description || null,
      brand: d.brand || null,
      category_id: d.category_id,
      subcategory: d.subcategory || null,
      image_url: d.image_url || null,
      featured: d.featured,
      promotion: d.promotion,
      active: d.active,
    })
    .select()
    .single();

  if (productError || !product) {
    return { error: productError?.message?.includes("duplicate") ? "Ce slug existe deja." : "Impossible de creer le produit." };
  }

  const { error: variantError } = await supabase.from("product_variants").insert({
    product_id: product.id,
    size: d.size || null,
    unit: d.unit || null,
    sku: d.sku,
    barcode: d.barcode || null,
    selling_price: d.selling_price,
    previous_price: d.previous_price || null,
    cost_price: d.cost_price || null,
    inventory_quantity: d.inventory_quantity,
    low_stock_threshold: d.low_stock_threshold,
    is_default: true,
  });

  if (variantError) {
    return { error: variantError.message?.includes("duplicate") ? "Ce SKU existe deja." : "Impossible de creer la variante." };
  }

  revalidatePath("/admin/produits");
  return { error: null, productId: product.id as string };
}

export async function updateProduct(id: string, input: ProductInput) {
  const { supabase } = await requireStaff();
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Donnees invalides" };
  const d = parsed.data;

  const { error: productError } = await supabase
    .from("products")
    .update({
      name: d.name,
      slug: d.slug,
      description: d.description || null,
      brand: d.brand || null,
      category_id: d.category_id,
      subcategory: d.subcategory || null,
      image_url: d.image_url || null,
      featured: d.featured,
      promotion: d.promotion,
      active: d.active,
    })
    .eq("id", id);

  if (productError) return { error: "Impossible de mettre a jour le produit." };

  const { data: defaultVariant } = await supabase
    .from("product_variants")
    .select("id")
    .eq("product_id", id)
    .eq("is_default", true)
    .single();

  if (defaultVariant) {
    const { error: variantError } = await supabase
      .from("product_variants")
      .update({
        size: d.size || null,
        unit: d.unit || null,
        sku: d.sku,
        barcode: d.barcode || null,
        selling_price: d.selling_price,
        previous_price: d.previous_price || null,
        cost_price: d.cost_price || null,
        inventory_quantity: d.inventory_quantity,
        low_stock_threshold: d.low_stock_threshold,
      })
      .eq("id", defaultVariant.id);
    if (variantError) return { error: "Impossible de mettre a jour la variante." };
  }

  revalidatePath("/admin/produits");
  return { error: null };
}

export async function toggleProductActive(id: string, active: boolean) {
  const { supabase } = await requireStaff();
  const { error } = await supabase.from("products").update({ active }).eq("id", id);
  if (error) return { error: "Impossible de mettre a jour le produit." };
  revalidatePath("/admin/produits");
  return { error: null };
}

export async function deleteProduct(id: string) {
  const { supabase } = await requireStaff();
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) return { error: "Impossible de supprimer le produit (verifiez qu'il n'a pas de commandes liees)." };
  revalidatePath("/admin/produits");
  return { error: null };
}

export async function updateVariantInventory(variantId: string, inventory_quantity: number, low_stock_threshold?: number) {
  const { supabase } = await requireStaff();
  const payload: Record<string, number> = { inventory_quantity };
  if (typeof low_stock_threshold === "number") payload.low_stock_threshold = low_stock_threshold;
  const { error } = await supabase.from("product_variants").update(payload).eq("id", variantId);
  if (error) return { error: "Impossible de mettre a jour l'inventaire." };
  revalidatePath("/admin/inventaire");
  revalidatePath("/admin/produits");
  return { error: null };
}

// ============ Bulk actions (used by the draft-product review UI) ============

export async function bulkUpdateCategory(productIds: string[], categoryId: string) {
  const { supabase } = await requireStaff();
  if (productIds.length === 0) return { error: "Aucun produit selectionne." };
  const { error } = await supabase
    .from("products")
    .update({ category_id: categoryId })
    .in("id", productIds);
  if (error) return { error: "Impossible de changer la categorie." };
  revalidatePath("/admin/produits");
  return { error: null };
}

export async function bulkUpdatePrice(productIds: string[], price: number) {
  const { supabase } = await requireStaff();
  if (productIds.length === 0) return { error: "Aucun produit selectionne." };
  if (!price || price <= 0) return { error: "Prix invalide." };
  const { error } = await supabase
    .from("product_variants")
    .update({ selling_price: price })
    .in("product_id", productIds)
    .eq("is_default", true);
  if (error) return { error: "Impossible de changer le prix." };
  revalidatePath("/admin/produits");
  return { error: null };
}

export async function bulkUpdateStock(productIds: string[], quantity: number) {
  const { supabase } = await requireStaff();
  if (productIds.length === 0) return { error: "Aucun produit selectionne." };
  if (quantity < 0) return { error: "Quantite invalide." };
  const { error } = await supabase
    .from("product_variants")
    .update({ inventory_quantity: quantity })
    .in("product_id", productIds)
    .eq("is_default", true);
  if (error) return { error: "Impossible de changer le stock." };
  revalidatePath("/admin/produits");
  revalidatePath("/admin/inventaire");
  return { error: null };
}

export async function bulkMarkVerified(productIds: string[]) {
  const { supabase } = await requireStaff();
  if (productIds.length === 0) return { error: "Aucun produit selectionne." };
  const { error } = await supabase
    .from("products")
    .update({ is_draft_product: false })
    .in("id", productIds);
  if (error) return { error: "Impossible de marquer comme verifie." };
  revalidatePath("/admin/produits");
  return { error: null };
}

export async function bulkDeleteProducts(productIds: string[]) {
  const { supabase } = await requireStaff();
  if (productIds.length === 0) return { error: "Aucun produit selectionne." };
  const { error } = await supabase.from("products").delete().in("id", productIds);
  if (error) return { error: "Impossible de supprimer (verifiez les commandes liees)." };
  revalidatePath("/admin/produits");
  return { error: null };
}

export async function uploadProductImage(formData: FormData) {
  await requireStaff();
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { error: "Aucun fichier fourni.", url: null };

  const admin = createAdminClient();
  const ext = file.name.split(".").pop() || "jpg";
  const path = `products/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await admin.storage
    .from("product-images")
    .upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: false });

  if (error) return { error: "Echec du telechargement de l'image.", url: null };

  const { data } = admin.storage.from("product-images").getPublicUrl(path);
  return { error: null, url: data.publicUrl };
}
