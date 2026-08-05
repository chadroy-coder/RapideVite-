-- 0013 only stripped the "Produit brouillon" reviewer note. A second
-- variant from the same bulk import also leaked into customer-facing
-- descriptions: "Photo produit reelle provenant d'une fiche revendeur
-- (URL)". Both variants always start with "Photo produit", so strip
-- everything from that point onward generically, covering both (and any
-- future similar note that follows the same convention).
update public.products
set description = trim(
  regexp_replace(description, '\s*Photo produit.*$', '', 'i')
)
where description ~* 'Photo produit';
