-- Converts the catalog from HTG to USD pricing, using the exchange rate at
-- the time of this migration (1 USD ~= 130.75 HTG, August 2026).
--
-- Only forward-looking prices are converted: product variants, the standing
-- delivery fee, and any per-zone delivery fees. Historical orders and
-- order_items are left untouched - they recorded real HTG-denominated
-- transactions and should keep their original values for accurate
-- accounting. All NEW orders placed after this migration will be computed
-- from the now-USD-priced catalog.

update public.product_variants
set
  selling_price = round(selling_price / 130.75, 2),
  previous_price = case when previous_price is not null then round(previous_price / 130.75, 2) else null end,
  cost_price = case when cost_price is not null then round(cost_price / 130.75, 2) else null end;

update public.delivery_settings
set standard_delivery_fee = round(standard_delivery_fee / 130.75, 2);

update public.delivery_zones
set fee = round(fee / 130.75, 2);
