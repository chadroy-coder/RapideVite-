/**
 * Read-only diagnostic: lists every category in the DB, its sort_order, and
 * how many live (active, non-draft) products reference it. Flags any
 * category whose slug falls outside RapideVite's canonical taxonomy so we
 * can see exactly what's cluttering the homepage nav before touching data.
 *
 * Run with: npx tsx scripts/diagnose-categories.ts
 * Makes no writes.
 */

import { config as loadEnvLocal } from "dotenv";
import { createClient } from "@supabase/supabase-js";

loadEnvLocal({ path: ".env.local" });

const CANONICAL_SLUGS = new Set([
  "alcool-spiritueux",
  "boissons",
  "epicerie",
  "fruits-legumes",
  "produits-menagers",
  "produits-surgeles",
  "collations",
  "pain-petit-dejeuner",
  "soins-personnels",
  "fleurs",
]);

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
  }
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const { data: categories, error: catErr } = await supabase
    .from("categories")
    .select("id, name, slug, sort_order, active, created_at")
    .order("sort_order", { ascending: true });
  if (catErr || !categories) {
    console.error("Could not load categories:", catErr?.message);
    process.exit(1);
  }

  console.log(`\nFound ${categories.length} categories total.\n`);
  console.log(
    "slug".padEnd(28) +
      "name".padEnd(28) +
      "sort".padEnd(6) +
      "active".padEnd(8) +
      "live_products".padEnd(15) +
      "draft_products".padEnd(15) +
      "canonical?"
  );
  console.log("-".repeat(115));

  let junkCount = 0;
  let junkProductCount = 0;

  for (const c of categories) {
    const live = await supabase
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("category_id", c.id)
      .eq("active", true)
      .eq("is_draft_product", false);
    const draft = await supabase
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("category_id", c.id)
      .eq("is_draft_product", true);

    const isCanonical = CANONICAL_SLUGS.has(c.slug);
    if (!isCanonical) {
      junkCount++;
      junkProductCount += (live.count ?? 0) + (draft.count ?? 0);
    }

    console.log(
      c.slug.padEnd(28) +
        c.name.padEnd(28) +
        String(c.sort_order).padEnd(6) +
        String(c.active).padEnd(8) +
        String(live.count ?? 0).padEnd(15) +
        String(draft.count ?? 0).padEnd(15) +
        (isCanonical ? "yes" : "NO <-- junk")
    );
  }

  console.log("\n" + "=".repeat(60));
  console.log(`Non-canonical categories: ${junkCount}`);
  console.log(`Products sitting under non-canonical categories: ${junkProductCount}`);
  console.log("=".repeat(60) + "\n");
}

main().catch((err) => {
  console.error("Diagnostic failed:", err);
  process.exit(1);
});
