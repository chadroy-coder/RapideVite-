/**
 * Open Food Facts / Open Beauty Facts / Open Products Facts importer.
 *
 * Pulls real, factual product records (name, brand, barcode, package size,
 * ingredients, front image) from the Open Food Facts family of open,
 * crowd-sourced product databases and loads them into RapideVite as DRAFT
 * products (is_draft_product = true) for a staff member to review, price,
 * and verify before they ever appear on the customer storefront.
 *
 * - Images are downloaded and re-uploaded into your own Supabase Storage
 *   bucket ("product-images"), never hotlinked from openfoodfacts.org.
 * - Prices and stock quantities are NOT taken from any external source -
 *   they are randomly generated placeholders within a reasonable band per
 *   category, clearly for testing only. A human must review and confirm
 *   real pricing before a draft product is marked verified.
 * - Products missing a name, brand, barcode, package size, or usable front
 *   image are skipped entirely.
 *
 * Open Food Facts photos are contributor snapshots (people photographing
 * items while barcode-scanning), not professional catalog photography, so
 * quality varies a lot. Use --preview to generate a local HTML contact
 * sheet of candidate photos BEFORE anything touches your database, so you
 * can eyeball quality first:
 *
 *   npx tsx scripts/import-open-food-facts.ts --preview --limit=20
 *   -> writes ./import-preview.html, open it in your browser
 *
 * Once you're happy with what you see, run the real import (no --preview):
 *
 *   npx tsx scripts/import-open-food-facts.ts --limit=10
 *   npx tsx scripts/import-open-food-facts.ts --limit=100
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to be set
 * in .env.local (the service role key is required because this script
 * writes directly to the database and Storage, bypassing RLS). --preview
 * mode does not need these and never contacts Supabase.
 */

import { config as loadEnvLocal } from "dotenv";
import { writeFileSync } from "fs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { slugify } from "../src/lib/format";

loadEnvLocal({ path: ".env.local" });

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------
const limitArg = process.argv.find((a) => a.startsWith("--limit"));
const LIMIT = limitArg
  ? parseInt(limitArg.includes("=") ? limitArg.split("=")[1] : process.argv[process.argv.indexOf(limitArg) + 1], 10)
  : 10;

const PREVIEW = process.argv.includes("--preview");

if (!Number.isFinite(LIMIT) || LIMIT <= 0) {
  console.error('Invalid --limit value. Example: npx tsx scripts/import-open-food-facts.ts --limit=10');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Category mapping: Open Food/Beauty/Products Facts category tag -> our
// RapideVite category slug (see supabase/seed/seed.sql for the full list).
// ---------------------------------------------------------------------------
type OffBase = "food" | "beauty" | "products";

interface CategoryTarget {
  label: string;
  offBase: OffBase;
  offTag: string;
  rapideviteSlug: string;
  // Brands commonly found in Caribbean/US grocery stores. OFF's own
  // "country sold in" tagging is too inconsistent to filter on reliably, so
  // instead we fetch a larger pool per category and prioritize results whose
  // brand matches one of these (falling back to whatever else is available).
  recognizableBrands: string[];
}

const CATEGORY_TARGETS: CategoryTarget[] = [
  {
    label: "Soft drinks",
    offBase: "food",
    offTag: "sodas",
    rapideviteSlug: "boissons",
    recognizableBrands: ["coca-cola", "coca cola", "coke", "pepsi", "sprite", "fanta", "dr pepper", "7up", "mountain dew", "crush", "canada dry"],
  },
  {
    label: "Water",
    offBase: "food",
    offTag: "waters",
    rapideviteSlug: "eau",
    recognizableBrands: ["dasani", "aquafina", "poland spring", "evian", "nestle pure life", "fiji", "voss", "perrier", "culligan", "smartwater", "deer park"],
  },
  {
    label: "Juice",
    offBase: "food",
    offTag: "fruit-juices",
    rapideviteSlug: "boissons",
    recognizableBrands: ["tropicana", "minute maid", "ocean spray", "welch", "simply", "sunny delight", "capri sun", "hi-c", "hawaiian punch"],
  },
  {
    label: "Energy drinks",
    offBase: "food",
    offTag: "energy-drinks",
    rapideviteSlug: "boissons",
    recognizableBrands: ["red bull", "monster", "gatorade", "rockstar", "bang", "powerade", "5-hour energy", "celsius"],
  },
  {
    label: "Chips and snacks",
    offBase: "food",
    offTag: "salty-snacks",
    rapideviteSlug: "collations",
    recognizableBrands: ["lay's", "lays", "doritos", "pringles", "cheetos", "ruffles", "tostitos", "fritos", "sun chips", "cheez-it"],
  },
  {
    label: "Cookies and candy",
    offBase: "food",
    offTag: "biscuits-and-cakes",
    rapideviteSlug: "collations",
    recognizableBrands: ["oreo", "chips ahoy", "nutter butter", "m&m", "snickers", "skittles", "reese", "hershey", "kit kat", "twix", "milky way"],
  },
  {
    label: "Cereal",
    offBase: "food",
    offTag: "breakfast-cereals",
    rapideviteSlug: "pain-petit-dejeuner",
    recognizableBrands: ["kellogg", "frosted flakes", "cheerios", "corn flakes", "froot loops", "special k", "honey nut", "cap'n crunch", "quaker", "raisin bran", "lucky charms"],
  },
  {
    label: "Pasta and rice",
    offBase: "food",
    offTag: "pastas",
    rapideviteSlug: "epicerie",
    recognizableBrands: ["barilla", "ronzoni", "goya", "mahatma", "uncle ben", "de cecco", "success rice", "carolina rice"],
  },
  {
    label: "Canned foods",
    offBase: "food",
    offTag: "canned-foods",
    rapideviteSlug: "epicerie",
    recognizableBrands: ["goya", "campbell", "del monte", "bush's", "chef boyardee", "hormel", "progresso", "libby"],
  },
  {
    label: "Milk and breakfast products",
    offBase: "food",
    offTag: "milks",
    rapideviteSlug: "pain-petit-dejeuner",
    recognizableBrands: ["nestle", "carnation", "eggo", "aunt jemima", "quaker", "lactaid", "borden", "horizon"],
  },
  {
    label: "Personal care",
    offBase: "beauty",
    offTag: "hygiene",
    rapideviteSlug: "soins-personnels",
    recognizableBrands: ["colgate", "crest", "dove", "nivea", "gillette", "head & shoulders", "head and shoulders", "old spice", "axe", "palmolive", "secret", "degree"],
  },
  {
    label: "Household products",
    offBase: "products",
    offTag: "cleaning-products",
    rapideviteSlug: "produits-menagers",
    recognizableBrands: ["tide", "dawn", "clorox", "lysol", "pine-sol", "ajax", "mr clean", "fabuloso", "windex", "febreze"],
  },
];

function offBaseUrl(base: OffBase): string {
  if (base === "food") return "https://world.openfoodfacts.org";
  if (base === "beauty") return "https://world.openbeautyfacts.org";
  return "https://world.openproductsfacts.org";
}

// Draft price bands (HTG) per RapideVite category - placeholders only.
const PRICE_BANDS: Record<string, [number, number]> = {
  boissons: [60, 250],
  eau: [25, 300],
  collations: [90, 220],
  epicerie: [120, 400],
  "pain-petit-dejeuner": [100, 400],
  "soins-personnels": [90, 350],
  "produits-menagers": [120, 300],
};

function draftPrice(slug: string): number {
  const [min, max] = PRICE_BANDS[slug] ?? [80, 300];
  return Math.round((min + Math.random() * (max - min)) / 5) * 5;
}

function draftStock(): number {
  return Math.floor(20 + Math.random() * 130);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Open Food Facts API
// ---------------------------------------------------------------------------
interface OffProduct {
  code: string;
  product_name?: string;
  brands?: string;
  quantity?: string;
  image_front_url?: string;
  image_url?: string;
  ingredients_text?: string;
  ingredients_text_en?: string;
}

// Open Food Facts throttles anonymous API clients that fire requests back to
// back and will return 503s under load. Retry with backoff before giving up
// on a category.
async function fetchWithRetry(url: string, attempts = 4): Promise<Response | null> {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "RapideVite-Importer/1.0 (contact: admin@rapidevite.ht)" },
      });
      if (res.ok) return res;
      if (res.status === 503 || res.status === 429) {
        const waitMs = 1500 * (i + 1);
        console.warn(`   ! HTTP ${res.status}, retrying in ${waitMs}ms (attempt ${i + 1}/${attempts})...`);
        await sleep(waitMs);
        continue;
      }
      console.warn(`   ! HTTP ${res.status} (not retryable)`);
      return null;
    } catch (err) {
      console.warn(`   ! Network error (attempt ${i + 1}/${attempts}):`, (err as Error).message);
      await sleep(1000 * (i + 1));
    }
  }
  return null;
}

function buildSearchUrl(target: CategoryTarget, poolSize: number): string {
  const fields = "code,product_name,brands,quantity,image_front_url,image_url,ingredients_text,ingredients_text_en";
  return (
    `${offBaseUrl(target.offBase)}/api/v2/search?categories_tags_en=${encodeURIComponent(target.offTag)}` +
    `&fields=${fields}&page_size=${poolSize}&sort_by=unique_scans_n`
  );
}

function matchesRecognizableBrand(brand: string, target: CategoryTarget): boolean {
  const normalized = brand.toLowerCase();
  return target.recognizableBrands.some((known) => normalized.includes(known));
}

// RapideVite's storefront is French-first for a Haitian audience. Some OFF
// listings for otherwise-recognizable brands (e.g. Aquafina) were entered
// under a regional listing with the product name in Arabic, Cyrillic, CJK,
// etc. Skip those rather than show non-Latin text in the catalog.
const NON_LATIN_SCRIPT_RE =
  /[֐-׿؀-ۿݐ-ݿЀ-ӿ一-鿿぀-ヿ가-힯฀-๿ऀ-ॿ]/;

function isLatinScript(text: string): boolean {
  return !NON_LATIN_SCRIPT_RE.test(text);
}

async function fetchCategoryProducts(target: CategoryTarget, count: number): Promise<OffProduct[]> {
  // Open Food Facts' own "sold in country" tagging is too inconsistent to
  // filter on reliably, so instead we pull a larger candidate pool per
  // category and prefer results whose brand matches our own curated list of
  // brands common in Caribbean/US grocery stores (per spec requirement #3),
  // falling back to whatever else is available so a category is never empty.
  const poolSize = Math.max(count * 12, 40);
  const res = await fetchWithRetry(buildSearchUrl(target, poolSize));
  if (!res) {
    console.warn(`   ! Giving up on "${target.label}" after retries.`);
    return [];
  }
  const json = (await res.json()) as { products?: OffProduct[] };
  const products = json.products ?? [];

  const valid = products.filter(
    (p) =>
      p.code &&
      p.product_name?.trim() &&
      p.brands?.trim() &&
      (p.image_front_url || p.image_url) &&
      p.quantity?.trim() &&
      isLatinScript(p.product_name!) &&
      isLatinScript(p.brands!)
  );

  const recognizable = valid.filter((p) => matchesRecognizableBrand(p.brands!, target));
  const others = valid.filter((p) => !matchesRecognizableBrand(p.brands!, target));

  if (recognizable.length > 0) {
    console.log(`   (${recognizable.length}/${valid.length} candidates matched a known Caribbean/US brand)`);
  } else {
    console.warn(`   ! No known Caribbean/US brand match for "${target.label}", using best available instead.`);
  }

  return [...recognizable, ...others];
}

async function downloadAndUploadImage(
  supabase: SupabaseClient,
  imageUrl: string,
  barcode: string
): Promise<string | null> {
  try {
    const res = await fetch(imageUrl);
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    const ext = contentType.includes("png") ? "png" : "jpg";
    const buffer = Buffer.from(await res.arrayBuffer());
    const path = `imported/${barcode}.${ext}`;

    const { error } = await supabase.storage
      .from("product-images")
      .upload(path, buffer, { contentType, upsert: true });

    if (error) {
      console.warn(`   ! Storage upload failed for barcode ${barcode}: ${error.message}`);
      return null;
    }
    const { data } = supabase.storage.from("product-images").getPublicUrl(path);
    return data.publicUrl;
  } catch (err) {
    console.warn(`   ! Image download failed for barcode ${barcode}:`, (err as Error).message);
    return null;
  }
}

function buildDescription(p: OffProduct): string {
  const parts: string[] = [];
  if (p.quantity) parts.push(`Format: ${p.quantity}.`);
  const ingredients = p.ingredients_text_en || p.ingredients_text;
  if (ingredients) {
    const trimmed = ingredients.length > 220 ? `${ingredients.slice(0, 220).trim()}...` : ingredients;
    parts.push(`Ingredients: ${trimmed}`);
  }
  parts.push("(Donnees importees depuis Open Food Facts - a verifier avant publication.)");
  return parts.join(" ");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
interface ImportedRow {
  name: string;
  brand: string;
  category: string;
  barcode: string;
  size: string;
  price: number;
  stock: number;
}

interface PreviewRow {
  name: string;
  brand: string;
  category: string;
  barcode: string;
  size: string;
  imageUrl: string;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function writePreviewHtml(rows: PreviewRow[]): string {
  const cards = rows
    .map(
      (r) => `
      <div class="card">
        <img src="${escapeHtml(r.imageUrl)}" loading="lazy" alt="${escapeHtml(r.name)}" />
        <div class="meta">
          <div class="name">${escapeHtml(r.name)}</div>
          <div class="brand">${escapeHtml(r.brand)}</div>
          <div class="tags">${escapeHtml(r.category)} &middot; ${escapeHtml(r.size)} &middot; ${escapeHtml(r.barcode)}</div>
        </div>
      </div>`
    )
    .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>RapideVite - Open Food Facts image preview</title>
<style>
  body { font-family: -apple-system, system-ui, sans-serif; background: #f7f5f2; margin: 0; padding: 24px; }
  h1 { font-size: 18px; }
  p.note { color: #666; max-width: 700px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; margin-top: 20px; }
  .card { background: white; border: 1px solid #e5e0da; border-radius: 12px; overflow: hidden; }
  .card img { width: 100%; height: 220px; object-fit: cover; background: #eee; display: block; }
  .meta { padding: 10px; }
  .name { font-weight: 600; font-size: 13px; }
  .brand { font-size: 12px; color: #444; }
  .tags { font-size: 11px; color: #999; margin-top: 4px; }
</style>
</head>
<body>
  <h1>RapideVite - Open Food Facts image preview (${rows.length} candidates)</h1>
  <p class="note">
    These images are hotlinked directly from openfoodfacts.org just for this preview -
    nothing here has been saved to your database yet. Look through them and decide if the
    overall quality is good enough to run the real import (no --preview flag), or if you
    want to adjust the category/brand list first.
  </p>
  <div class="grid">${cards}</div>
</body>
</html>`;
}

async function runPreview() {
  console.log(`\nBuilding a preview of up to ${LIMIT} candidate products (no database writes)...\n`);
  const perCategory = Math.max(1, Math.ceil(LIMIT / CATEGORY_TARGETS.length));
  const rows: PreviewRow[] = [];

  for (const target of CATEGORY_TARGETS) {
    if (rows.length >= LIMIT) break;
    const remaining = LIMIT - rows.length;
    const take = Math.min(perCategory, remaining);
    console.log(`-> ${target.label} (target: ${take})`);

    const candidates = await fetchCategoryProducts(target, take);
    await sleep(1200);

    let added = 0;
    for (const p of candidates) {
      if (added >= take || rows.length >= LIMIT) break;
      const imageUrl = p.image_front_url || p.image_url!;
      rows.push({
        name: p.product_name!.trim(),
        brand: p.brands!.split(",")[0].trim(),
        category: target.label,
        barcode: p.code,
        size: p.quantity ?? "?",
        imageUrl,
      });
      added++;
    }
  }

  const outPath = "import-preview.html";
  writeFileSync(outPath, writePreviewHtml(rows));
  console.log(`\nWrote ${rows.length} candidate(s) to ${outPath}`);
  console.log("Open it in your browser (double-click the file, or `open import-preview.html`) and take a look.\n");
}

async function main() {
  if (PREVIEW) {
    await runPreview();
    return;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const { data: categories, error: catErr } = await supabase.from("categories").select("id, slug");
  if (catErr || !categories) {
    console.error("Could not load categories from Supabase:", catErr?.message);
    process.exit(1);
  }
  const categoryIdBySlug = new Map(categories.map((c) => [c.slug as string, c.id as string]));

  const perCategory = Math.max(1, Math.ceil(LIMIT / CATEGORY_TARGETS.length));
  const imported: ImportedRow[] = [];

  console.log(`\nImporting up to ${LIMIT} draft products from Open Food Facts...\n`);

  for (const target of CATEGORY_TARGETS) {
    if (imported.length >= LIMIT) break;

    const categoryId = categoryIdBySlug.get(target.rapideviteSlug);
    if (!categoryId) {
      console.warn(`-> ${target.label}: no RapideVite category with slug "${target.rapideviteSlug}", skipping.`);
      continue;
    }

    const remaining = LIMIT - imported.length;
    const take = Math.min(perCategory, remaining);
    console.log(`-> ${target.label} (target: ${take})`);

    const candidates = await fetchCategoryProducts(target, take);
    await sleep(1200); // be a good API citizen between category requests

    let addedForThisCategory = 0;
    for (const p of candidates) {
      if (addedForThisCategory >= take || imported.length >= LIMIT) break;

      const name = p.product_name!.trim();
      const brand = p.brands!.split(",")[0].trim();
      const baseSlug = slugify(`${brand}-${name}`);

      const { data: existing } = await supabase
        .from("products")
        .select("id")
        .eq("slug", baseSlug)
        .maybeSingle();
      const slug = existing ? `${baseSlug}-${p.code.slice(-5)}` : baseSlug;

      const imageSourceUrl = p.image_front_url || p.image_url!;
      const uploadedUrl = await downloadAndUploadImage(supabase, imageSourceUrl, p.code);
      if (!uploadedUrl) {
        console.warn(`   x Skipped "${name}" - could not download/upload image.`);
        continue;
      }

      const price = draftPrice(target.rapideviteSlug);
      const stock = draftStock();

      const { data: product, error: productError } = await supabase
        .from("products")
        .upsert(
          {
            name,
            slug,
            description: buildDescription(p),
            brand,
            category_id: categoryId,
            image_url: uploadedUrl,
            active: true,
            is_draft_product: true,
            // Open Food Facts photos are contributor snapshots of varying
            // quality - never auto-approved. A human must visually confirm
            // the full package is visible, front-facing, centered, and on
            // a clean background before flipping this to "approved".
            image_quality_status: "needs_replacement",
          },
          { onConflict: "slug" }
        )
        .select("id")
        .single();

      if (productError || !product) {
        console.warn(`   x Could not save product "${name}": ${productError?.message}`);
        continue;
      }

      const { error: variantError } = await supabase.from("product_variants").upsert(
        {
          product_id: product.id,
          size: p.quantity ?? null,
          sku: p.code,
          barcode: p.code,
          selling_price: price,
          inventory_quantity: stock,
          is_default: true,
        },
        { onConflict: "sku" }
      );

      if (variantError) {
        console.warn(`   x Could not save variant for "${name}": ${variantError.message}`);
        continue;
      }

      imported.push({ name, brand, category: target.label, barcode: p.code, size: p.quantity ?? "?", price, stock });
      addedForThisCategory++;
      console.log(`   + ${name} (${brand}) - ${p.quantity} - ${price} HTG`);

      await sleep(150); // small delay between image downloads
    }
  }

  console.log(`\nDone. Imported ${imported.length} draft product(s).\n`);
  if (imported.length > 0) {
    console.table(imported);
  }
  console.log(
    "\nAll imported products are marked is_draft_product = true, so they will NOT show on the customer " +
      'storefront. Review them at /admin/produits (look for the "Draft" badge), adjust price/stock/category ' +
      'if needed using the bulk actions, then select them and click "Marquer verifie" to publish.\n'
  );
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
