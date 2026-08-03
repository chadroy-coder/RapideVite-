# RapideVite

**"Tout sa w bezwen, rapid vit."**

RapideVite is a mobile-first grocery and convenience-store delivery platform built for
customers in Haiti, in the spirit of Gopuff: fast browsing, a simple cart, and a clean
checkout. This repository contains the customer storefront and the staff/admin dashboard
that runs it.

## Tech stack

- **Next.js 16** (App Router, TypeScript, Turbopack)
- **Tailwind CSS v4**
- **Supabase** — Postgres database, authentication, and file storage for product images
- **React Hook Form + Zod** — forms and validation, client and server side
- **Zustand** — client cart/toast state (persisted to `localStorage`)
- **Papaparse + SheetJS (xlsx)** — CSV/Excel product import

## Project structure

```
src/
  app/
    (shop)/          customer storefront (home, category, search, product, cart, checkout,
                      order tracking, login/register, account, help, legal pages)
    admin/            staff/admin dashboard (products, categories, inventory, orders,
                      customers, reports, CSV/Excel import)
  components/         shared UI, product, cart, order, and admin components
  lib/
    actions/          server actions (checkout, auth, admin CRUD, bulk import)
    supabase/         browser/server/admin Supabase clients + auth middleware
    validations/      Zod schemas shared by client forms and server actions
  store/              Zustand cart + toast stores
  types/database.ts   TypeScript types mirroring the SQL schema
supabase/
  migrations/         SQL migrations (schema, RLS policies, storage bucket)
  seed/seed.sql        12 categories + 35 sample products with variants
public/templates/     downloadable CSV import template
```

## Architecture decisions worth knowing about

- **Checkout requires an account.** The cart works fully for guests (persisted in
  `localStorage`, no login needed to browse or add to cart), but placing an order requires
  signing in. This keeps order ownership and Row Level Security simple and correct for v1.
  Guest checkout can be added later by relaxing the `orders` RLS insert policy and adding a
  guest-token lookup flow.
- **Cart is device-local, not server-synced.** It persists across refreshes and survives
  login, but does not yet sync across devices. Prices and inventory are always re-verified
  from the database at checkout, so a stale local price can never be charged.
- **Product variants.** Every product has one or more `product_variants` rows (size/price/
  SKU/inventory each). The admin product form manages a single default variant; additional
  sizes can be added directly via SQL or a future "add variant" admin action — the schema
  already supports it.
- **RBAC.** `profiles.role` is `customer`, `staff`, or `admin`. Enforced in three layers:
  Postgres RLS policies (`supabase/migrations/0002_rls.sql`), `middleware.ts` (blocks
  non-staff before `/admin` renders), and a `requireStaff()`/`requireAdmin()` check inside
  every admin server action.
- **Payments.** Cash on delivery, MonCash, NatCash, and card are selectable at checkout as
  placeholders. No live payment processing is wired up — orders are created with
  `payment_status: pending` regardless of method, ready for a real MonCash/NatCash/card
  integration to be dropped in later.

## Local development

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy the environment template and fill in your Supabase project values:
   ```bash
   cp .env.example .env.local
   ```
3. Run the dev server:
   ```bash
   npm run dev
   ```
   The site runs at http://localhost:3000, the admin dashboard at http://localhost:3000/admin.

## Supabase setup

1. Create a project at https://supabase.com.
2. In the SQL editor, run the migrations **in order**:
   - `supabase/migrations/0001_init.sql`
   - `supabase/migrations/0002_rls.sql`
   - `supabase/migrations/0003_storage.sql`
3. (Optional but recommended for a working demo) run `supabase/seed/seed.sql` to load 12
   categories and 35 sample products.
4. Copy your project's **Project URL**, **anon public key**, and **service_role key** from
   Project Settings → API into `.env.local`.
5. Create your first admin account:
   - Sign up normally through `/register` on the running site.
   - In the SQL editor, promote that account:
     ```sql
     update public.profiles set role = 'admin'
     where id = (select id from auth.users where email = 'you@example.com');
     ```
6. Visit `/admin` — you should now see the dashboard.

### Required environment variables

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public API key (safe for the browser) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key — **server only**, used for image uploads and bulk import. Never expose this to the client. |
| `NEXT_PUBLIC_SITE_URL` | Public site URL (used for metadata/links) |
| `NEXT_PUBLIC_DEFAULT_LOCALE` | Default UI locale, `fr` for launch |
| `NEXT_PUBLIC_DEFAULT_DELIVERY_FEE` | Fallback delivery fee shown before the server total is confirmed |
| `STRIPE_SECRET_KEY` | Stripe secret key — **server only**, used to create Checkout Sessions |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key (safe for the browser; reserved for future use) |
| `STRIPE_WEBHOOK_SECRET` | Signing secret for the `/api/webhooks/stripe` endpoint |
| `STRIPE_CURRENCY` | Currency for Checkout line items, defaults to `usd` |

## Importing real draft products (Open Food Facts)

`scripts/import-open-food-facts.ts` pulls real, factual product records — name, brand,
barcode, package size, ingredients, and a front product photo — from the free
[Open Food Facts](https://world.openfoodfacts.org) database (plus its sister projects
Open Beauty Facts and Open Products Facts for personal care and household items). It
does **not** invent products or use AI-generated images: every product it imports is a
real item that exists in those open databases.

What it does, per product:

- Downloads the front product photo and re-uploads it into your own Supabase Storage
  bucket (`product-images`) — nothing is hotlinked from openfoodfacts.org.
- Writes a short, factual description built only from OFF data (package size +
  ingredient list), never marketing copy.
- Generates a **draft price and draft stock quantity locally** — these are random
  placeholders within a reasonable band per category, clearly for testing only, and are
  never copied from Open Food Facts or any retailer.
- Saves the product with `is_draft_product = true`.

Draft products never appear on the customer storefront (this is enforced both in the
product queries and in the RLS policy on `products`). In the admin dashboard, they show
an amber "Draft" badge. Select one or more draft products on `/admin/produits` to bulk
change their category, price, or stock, mark them verified (clears the draft flag), or
delete them.

**Setup:**

```bash
npm install       # pulls in tsx + dotenv, added for this script
```

**Run the migration first** — open `supabase/migrations/0004_draft_products.sql` in the
Supabase SQL Editor and run it (adds the `is_draft_product` column + policy).

**Preview images before anything touches your database.** Open Food Facts photos are
contributor snapshots (people photographing items while barcode-scanning), not
professional catalog photography, so quality varies a lot from product to product.
Rather than trust it blindly, generate a local preview page first:

```bash
npx tsx scripts/import-open-food-facts.ts --preview --limit=20
```

This writes `import-preview.html` in the project folder — no database or Supabase
Storage writes happen in preview mode. Open that file in your browser (double-click it,
or run `open import-preview.html`) and look at the actual photos before deciding whether
to import.

**Then run the real importer** once you're happy with what you saw:

```bash
npm run import:off -- --limit=10
```

Review the console output and the products at `/admin/produits`. Open each draft and
look at its photo before marking it verified — don't bulk-verify without checking, since
a good console summary doesn't guarantee a good photo. If it looks good, run the full
import:

```bash
npm run import:off -- --limit=100
```

The script is safe to re-run — it upserts on product slug and variant SKU/barcode, so
re-running with a higher `--limit` won't duplicate products you've already imported.

## Stripe (card payments)

Cash on delivery, MonCash, and NatCash remain manual/UI-only. Card payments go through
Stripe Checkout (hosted page — no card data ever touches this app's server):

1. Run migration `supabase/migrations/0006_stripe.sql` against your Supabase project (adds
   `stripe_checkout_session_id` / `stripe_payment_intent_id` to `orders`).
2. In the Stripe Dashboard, grab your secret + publishable keys (Developers > API keys) and
   set `STRIPE_SECRET_KEY` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` in `.env.local`.
3. Create a webhook endpoint pointing at `https://your-domain/api/webhooks/stripe`
   (Developers > Webhooks), subscribed to `checkout.session.completed`,
   `checkout.session.async_payment_succeeded`, and `checkout.session.async_payment_failed`.
   Copy its signing secret into `STRIPE_WEBHOOK_SECRET`.
4. For local testing, use the Stripe CLI instead of a real webhook endpoint:
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```
   It prints a `whsec_...` secret — use that locally instead of the Dashboard one.
5. `STRIPE_CURRENCY` defaults to `usd`, matching the storefront's prices.

Flow: selecting "Carte bancaire" at checkout creates the order first (same as the other
payment methods — inventory is reserved immediately), then redirects to Stripe Checkout.
The webhook marks `payment_status = 'paid'` once Stripe confirms the charge; if the
customer abandons or cancels the Stripe page, the order stays `pending` and is visible as
such in `/admin/commandes`.

## Deployment (Vercel)

1. Push this repository to GitHub/GitLab/Bitbucket.
2. Import the repo in Vercel.
3. Add the environment variables above in the Vercel project settings (use your production
   Supabase project's keys and your live — not test — Stripe keys).
4. Deploy. Vercel will run `next build` automatically.
5. Point your domain at the Vercel deployment (Vercel project settings > Domains > add
   `rapidevite.com`, then add the CNAME/A record it gives you at your registrar) and update
   `NEXT_PUBLIC_SITE_URL` to `https://rapidevite.com`.
6. Update the Stripe webhook endpoint URL (step 3 above) to use the live domain once it's
   live, and switch `STRIPE_SECRET_KEY` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` to your Stripe
   **live mode** keys (test mode keys won't process real cards).

## Test admin credentials (development only)

No seeded auth users ship with this repo (Supabase auth users can't be created via plain
SQL). After running the seed script, create a real account through `/register` and promote
it to `admin` using the SQL snippet above. Suggested dev credentials to use locally:

- Email: `admin@rapidevite.ht`
- Password: choose your own (minimum 6 characters)

## Internationalization

The UI ships in French for launch. All user-facing strings live directly in components
today; `NEXT_PUBLIC_DEFAULT_LOCALE` is reserved for when French, Haitian Creole, and English
are split into locale dictionaries (e.g. via `next-intl`) — the component structure was kept
simple on purpose so that swap is additive, not a rewrite.

## Known gaps / what's next

- Card payments run through Stripe Checkout (see the Stripe section above); MonCash and
  NatCash remain UI placeholders only — no live gateway integration for those two yet.
- No per-zone delivery fees yet — `delivery_zones` table exists and is ready, but the
  checkout flow currently uses a single `delivery_settings.standard_delivery_fee`.
- No email/SMS order notifications.
- No automated test suite yet (manual QA: signup/login, browse → cart → checkout → track,
  and the full admin CRUD + CSV import flow were all verified against a real Supabase
  project during development).
- Guest checkout (see "Architecture decisions" above).

## Security notes

- `SUPABASE_SERVICE_ROLE_KEY` bypasses Row Level Security — it is only read in
  `src/lib/supabase/admin.ts`, which is never imported from a Client Component. Do not add
  a service-role import to anything under `"use client"`.
- Every admin server action re-verifies the caller's role server-side via `requireStaff()`/
  `requireAdmin()`, independent of RLS and middleware, so a compromised or bypassed route
  guard still can't mutate data.
- Order totals, product prices, and inventory checks are always recomputed server-side in
  `placeOrder()` (`src/lib/actions/orders.ts`) from the database — the client only sends
  variant IDs and quantities.
