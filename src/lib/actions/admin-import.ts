"use server";

import { requireStaff } from "@/lib/require-staff";
import { slugify } from "@/lib/format";

export interface ImportRow {
  name?: string;
  description?: string;
  brand?: string;
  category?: string;
  size?: string;
  price?: string | number;
  sku?: string;
  barcode?: string;
  inventory?: string | number;
  image_url?: string;
}

export interface ImportResult {
  row: number;
  name: string;
  status: "created" | "updated" | "error";
  message?: string;
}

export async function bulkImportProducts(rows: ImportRow[]) {
  const { supabase } = await requireStaff();

  const { data: categories } = await supabase.from("categories").select("id, name, slug");
  const categoryByName = new Map(
    (categories ?? []).map((c) => [c.name.trim().toLowerCase(), c.id])
  );
  const categoryBySlug = new Map((categories ?? []).map((c) => [c.slug, c.id]));

  const results: ImportResult[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // account for header row in the source file
    const name = (row.name ?? "").toString().trim();

    if (!name) {
      results.push({ row: rowNum, name: "(sans nom)", status: "error", message: "Nom du produit manquant." });
      continue;
    }
    const price = Number(row.price);
    if (!price || price <= 0) {
      results.push({ row: rowNum, name, status: "error", message: "Prix invalide." });
      continue;
    }
    const sku = (row.sku ?? "").toString().trim();
    if (!sku) {
      results.push({ row: rowNum, name, status: "error", message: "SKU manquant." });
      continue;
    }
    const categoryKey = (row.category ?? "").toString().trim().toLowerCase();
    const categoryId = categoryByName.get(categoryKey) ?? categoryBySlug.get(slugify(categoryKey));
    if (!categoryId) {
      results.push({ row: rowNum, name, status: "error", message: `Categorie "${row.category ?? ""}" introuvable.` });
      continue;
    }

    const slug = slugify(name);
    const inventory = Number(row.inventory ?? 0) || 0;

    try {
      const { data: existingProduct } = await supabase
        .from("products")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();

      let productId: string;
      const isNew = !existingProduct;

      if (existingProduct) {
        productId = existingProduct.id;
        await supabase
          .from("products")
          .update({
            name,
            description: row.description || null,
            brand: row.brand || null,
            category_id: categoryId,
            image_url: row.image_url || null,
          })
          .eq("id", productId);
      } else {
        const { data: created, error: createError } = await supabase
          .from("products")
          .insert({
            name,
            slug,
            description: row.description || null,
            brand: row.brand || null,
            category_id: categoryId,
            image_url: row.image_url || null,
          })
          .select("id")
          .single();
        if (createError || !created) throw createError;
        productId = created.id;
      }

      const { data: existingVariant } = await supabase
        .from("product_variants")
        .select("id")
        .eq("sku", sku)
        .maybeSingle();

      if (existingVariant) {
        await supabase
          .from("product_variants")
          .update({
            product_id: productId,
            size: row.size || null,
            selling_price: price,
            barcode: row.barcode || null,
            inventory_quantity: inventory,
          })
          .eq("id", existingVariant.id);
      } else {
        await supabase.from("product_variants").insert({
          product_id: productId,
          size: row.size || null,
          selling_price: price,
          barcode: row.barcode || null,
          sku,
          inventory_quantity: inventory,
          is_default: true,
        });
      }

      results.push({ row: rowNum, name, status: isNew ? "created" : "updated" });
    } catch {
      results.push({ row: rowNum, name, status: "error", message: "Erreur lors de l'enregistrement." });
    }
  }

  return results;
}
