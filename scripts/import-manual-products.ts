/**
 * Manual product importer.
 *
 * For products where you've sent a real photo directly (not sourced from
 * Open Food Facts), this script reads scripts/manual-products.json, uploads
 * each listed image (from scripts/manual-images/) into Supabase Storage,
 * and creates/updates the matching product + variant, marked as a draft
 * product for you to review price/stock/category before publishing.
 *
 * Workflow:
 *   1. Claude adds an entry to scripts/manual-products.json and drops the
 *      image file into scripts/manual-images/.
 *   2. You run:  npm run import:manual
 *   3. Review the new draft(s) at /admin/produits, adjust price/stock, then
 *      select + "Marquer verifie" to publish.
 *
 * Safe to re-run: upserts on product slug and variant SKU, so re-running
 * after adding new entries to the manifest won't duplicate existing ones.
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in
 * .env.local.
 */

import { config as loadEnvLocal } from "dotenv";
import { readFileSync } from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

loadEnvLocal({ path: ".env.local" });

interface ManualProduct {
  slug: string;
  name: string;
  brand: string | null;
  categorySlug: string;
  categoryName?: string; // used to auto-create the category if it doesn't exist yet
  size: string | null;
  description: string;
  imageFile: string;
  price?: number;
  stock?: number;
  barcode?: string;
  // Never auto-set to "approved" by a script. Defaults to "needs_replacement"
  // so nothing is treated as storefront-ready until a human (or Claude,
  // after an explicit visual check against the quality rubric) marks it so
  // in the manifest.
  imageQualityStatus?: "approved" | "needs_replacement";
}

function draftPrice(): number {
  return Math.round((80 + Math.random() * 220) / 5) * 5;
}

function draftStock(): number {
  return Math.floor(20 + Math.random() * 130);
}

function contentTypeFor(file: string): string {
  const ext = file.split(".").pop()?.toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  return "image/jpeg";
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
  }
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const manifestPath = path.join(process.cwd(), "scripts", "manual-products.json");
  const manifest: ManualProduct[] = JSON.parse(readFileSync(manifestPath, "utf-8"));

  const { data: categories, error: catErr } = await supabase.from("categories").select("id, slug");
  if (catErr || !categories) {
    console.error("Could not load categories from Supabase:", catErr?.message);
    process.exit(1);
  }
  const categoryIdBySlug = new Map(categories.map((c) => [c.slug as string, c.id as string]));

  console.log(`\nImporting ${manifest.length} manually-sourced product(s)...\n`);

  const imported: { name: string; brand: string; category: string }[] = [];
  const skipped: { name: string; reason: string }[] = [];

  for (const entry of manifest) {
    let categoryId = categoryIdBySlug.get(entry.categorySlug);
    if (!categoryId) {
      // Auto-create the category if this manifest entry supplied a display
      // name for it (e.g. a new product line that doesn't map to any of
      // RapideVite's existing categories yet).
      if (entry.categoryName) {
        const { data: newCategory, error: newCategoryError } = await supabase
          .from("categories")
          .insert({ name: entry.categoryName, slug: entry.categorySlug, sort_order: 100 })
          .select("id")
          .single();
        if (newCategoryError || !newCategory) {
          console.warn(
            `x Skipping "${entry.name}" - could not create category "${entry.categoryName}": ${newCategoryError?.message}`
          );
          skipped.push({ name: entry.name, reason: `category creation failed (${entry.categorySlug})` });
          continue;
        }
        categoryId = newCategory.id as string;
        categoryIdBySlug.set(entry.categorySlug, categoryId);
        console.log(`   (created new category "${entry.categoryName}" / ${entry.categorySlug})`);
      } else {
        console.warn(`x Skipping "${entry.name}" - no category with slug "${entry.categorySlug}".`);
        skipped.push({ name: entry.name, reason: `unknown category "${entry.categorySlug}"` });
        continue;
      }
    }

    const imagePath = path.join(process.cwd(), "scripts", "manual-images", entry.imageFile);
    let imageBuffer: Buffer;
    try {
      imageBuffer = readFileSync(imagePath);
    } catch {
      console.warn(`x Skipping "${entry.name}" - image file not found at ${imagePath}.`);
      skipped.push({ name: entry.name, reason: `image file not found (${entry.imageFile})` });
      continue;
    }

    const ext = entry.imageFile.split(".").pop() || "jpg";
    const storagePath = `manual/${entry.slug}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("product-images")
      .upload(storagePath, imageBuffer, { contentType: contentTypeFor(entry.imageFile), upsert: true });

    if (uploadError) {
      console.warn(`x Skipping "${entry.name}" - storage upload failed: ${uploadError.message}`);
      skipped.push({ name: entry.name, reason: `storage upload failed (${uploadError.message})` });
      continue;
    }
    const { data: publicUrlData } = supabase.storage.from("product-images").getPublicUrl(storagePath);

    const { data: product, error: productError } = await supabase
      .from("products")
      .upsert(
        {
          name: entry.name,
          slug: entry.slug,
          description: entry.description,
          brand: entry.brand,
          category_id: categoryId,
          image_url: publicUrlData.publicUrl,
          active: true,
          is_draft_product: true,
          image_quality_status: entry.imageQualityStatus ?? "needs_replacement",
        },
        { onConflict: "slug" }
      )
      .select("id")
      .single();

    if (productError || !product) {
      console.warn(`x Could not save product "${entry.name}": ${productError?.message}`);
      skipped.push({ name: entry.name, reason: `product save failed (${productError?.message})` });
      continue;
    }

    const sku = `MANUAL-${entry.slug.toUpperCase()}`;
    const { error: variantError } = await supabase.from("product_variants").upsert(
      {
        product_id: product.id,
        size: entry.size,
        sku,
        barcode: entry.barcode ?? null,
        selling_price: entry.price ?? draftPrice(),
        inventory_quantity: entry.stock ?? draftStock(),
        is_default: true,
      },
      { onConflict: "sku" }
    );

    if (variantError) {
      console.warn(`x Could not save variant for "${entry.name}": ${variantError.message}`);
      skipped.push({ name: entry.name, reason: `variant save failed (${variantError.message})` });
      continue;
    }

    imported.push({ name: entry.name, brand: entry.brand ?? "(unbranded)", category: entry.categorySlug });
    console.log(`+ ${entry.name} (${entry.brand ?? "no brand identified"}) -> ${entry.categorySlug}`);
  }

  console.log(`\nDone. Imported ${imported.length}/${manifest.length} product(s).\n`);
  if (imported.length > 0) console.table(imported);
  if (skipped.length > 0) {
    console.log("\nCould not import:");
    console.table(skipped);
  }
  console.log(
    '\nAll new products are marked is_draft_product = true, so they are hidden from the customer storefront. ' +
      'Review them at /admin/produits, check the photo and category, set a real price/stock, then select and ' +
      '"Marquer verifie" to publish.\n'
  );
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
