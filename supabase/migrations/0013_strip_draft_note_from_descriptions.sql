-- The bulk product import (scripts/manual-products.json) appended an
-- internal reviewer note to the customer-facing description, e.g.
-- "... Photo produit fournie directement par vous. (Produit brouillon -
-- verifier le prix, le stock et le poids/unite de vente avant publication.)"
-- That note was meant for whoever reviews a product before publishing, not
-- for customers, but it was never stripped out. Remove it everywhere.
update public.products
set description = trim(
  regexp_replace(description, '\s*Photo produit fournie directement par vous\..*$', '', 'i')
)
where description ~* 'Produit brouillon';
