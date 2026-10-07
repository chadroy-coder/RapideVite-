-- Split the catch-all Epicerie category into specific aisles so shoppers
-- don't have to scroll through hundreds of unrelated products.
-- Existing Epicerie products are re-filed by name rules (first match wins);
-- anything that matches no rule (baking mixes, essences, sauces) stays in Epicerie.

insert into public.categories (name, slug, sort_order) values
  ('Fromages & beurre', 'fromages-beurre', 3),
  ('Conserves de legumes & fruits', 'conserves-legumes-fruits', 10),
  ('Viandes & poissons en conserve', 'conserves-viandes-poissons', 11),
  ('Plats prepares', 'plats-prepares', 12),
  ('Pates, riz & grains', 'pates-riz', 13),
  ('Confitures & tartinades', 'confitures-tartinades', 14),
  ('Miel & sirops', 'miel-sirops', 15),
  ('Sucre & edulcorants', 'sucre-edulcorants', 16)
on conflict (slug) do nothing;

update public.categories set sort_order = 1 where slug = 'promotions';
update public.categories set sort_order = 2 where slug = 'fruits-legumes';
update public.categories set sort_order = 4 where slug = 'produits-laitiers-oeufs';
update public.categories set sort_order = 5 where slug = 'viandes-charcuterie';
update public.categories set sort_order = 6 where slug = 'poissons-fruits-de-mer';
update public.categories set sort_order = 7 where slug = 'produits-surgeles';
update public.categories set sort_order = 8 where slug = 'pain-patisserie';
update public.categories set sort_order = 9 where slug = 'petit-dejeuner';
update public.categories set sort_order = 17 where slug = 'epicerie';
update public.categories set sort_order = 18 where slug = 'boissons';
update public.categories set sort_order = 19 where slug = 'alcools-spiritueux';
update public.categories set sort_order = 20 where slug = 'collations-friandises';
update public.categories set sort_order = 21 where slug = 'produits-menagers';
update public.categories set sort_order = 22 where slug = 'hygiene-soins-personnels';
update public.categories set sort_order = 23 where slug = 'produits-bebe';
update public.categories set sort_order = 24 where slug = 'sante-pharmacie';
update public.categories set sort_order = 25 where slug = 'papier-produits-jetables';
update public.categories set sort_order = 26 where slug = 'cuisine-maison';
update public.categories set sort_order = 27 where slug = 'produits-animaux';
update public.categories set sort_order = 28 where slug = 'electronique-accessoires';
update public.categories set sort_order = 29 where slug = 'fleurs';

update public.products p
set category_id = (select id from public.categories where slug = t.slug)
from (
  select p2.id,
    (select r.slug
       from (values
         (0,'viandes-charcuterie','butterball|noix d''epaule|bologna'),
         (1,'boissons','boost nutritional|protein shake'),
         (2,'produits-laitiers-oeufs','almond milk|soy milk|almondmilk|vegetal|bjorg (soja|amande|avoine|cajou|lait)|elle & vire|regilait|lait entier|lait concentre'),
         (3,'fromages-beurre','cheese snack bars'),
         (4,'collations-friandises','kambly|kettle cooked|galettes de riz|peanut butter cups|nutella biscuits|petit beurre|galettes pur beurre|mini granola|cookies|bars( |$)|pain d''epices'),
         (5,'petit-dejeuner','corn flakes|frosted flakes|bunches|honey ohs|great grains|cap''n crunch|s''mores|nestle fitness|clusters|pop & crisp|cruesli|cheerios|chex|cereales au chocolat'),
         (6,'conserves-legumes-fruits','no sugar added|mandarin|calorie sliced|fruit cocktail|chili beans'),
         (7,'viandes-charcuterie','(^| )spam'),
         (8,'fromages-beurre','philadelphia'),
         (9,'confitures-tartinades','polaner|peanut butter|almond butter|nutella|pate a tartiner|confiture|(^| )jam( |$)|jelly|preserves|marmalade|gelee'),
         (10,'conserves-legumes-fruits','in (heavy |light |lite )?syrup|au sirop|in 100%|apple sauce|cranberry sauce|sweet potatoes in'),
         (11,'miel-sirops','syrup|honey|molasses|maple|miel( |$)'),
         (12,'plats-prepares','shells and cheese|macaroni & cheese|dinner kit|taco shells|taco super shells|tostada|tortilla bowl|mashed potatoes|au gratin|chili \(|wendy''s chili|hormel chili|ravioli|lasagn|beefaroni|campbell''s spaghetti|cassoulet|choucroute|bourguignon|tajine|poelee|poulet cuit|saucisses aux lentilles|quenelles|bouchees|queues de veau|boulettes|hache de boeuf|corned beef hash|spaghetti carbonara|confit de canard'),
         (13,'conserves-viandes-poissons','tuna|clams|salmon|chicken|(^| )pates?( |$)|terrine|rillettes|foie gras|vienna|sausage|saucisse|spam|corned beef|luncheon|(^| )ham( |$)|jambonneau|chourico|langue de|grillons|escargot|potted|bacalhau|sanglier|hormel'),
         (14,'sucre-edulcorants','sugar|sucre|cassonade|sweetener|stevia|splenda|truvia|sweet''n low|equal original|sucarol|dixie crystals'),
         (15,'epicerie','sauce|manwich|essence|vanille|vanilla|baking|brownie|flour|stuffing|tortillas|stuffing'),
         (16,'pates-riz','pasta|(^| )pasta|penne|rotini|spaghetti|macaroni|noodle|quinoa|(^| )rice( |$)|riz( |$)|barilla'),
         (17,'fromages-beurre','cheese|fromage|cheddar|parmesan|mozzarella|gouda|brie|camembert|feta|ricotta|grana|asiago|gorgonzola|fontina|romano|emmental|comte|reblochon|roquefort|maroilles|epoisses|morbier|chaumes|soumaintrain|boursin|philadelphia|velveeta|cheez whiz|violife|snowdonia|jouvenceau|le vigneron|au bouchon|tarti''bon|president|lunchitas|sargento|crystal farms|butter|beurre|margarine|olivio|country crock|fleischmann|blue bonnet|vino rosso|meule|colby|monterey|muenster|pepper jack|bel gioioso|belgioioso|cabot|borden'),
         (18,'collations-friandises','chocolate|lindt|dove|hershey|kisses|oreo|kinder|reese|daim|roll-ups|gavottes|kambly|keebler|nonni|bingo|pim''s|chamonix|paille d''or|palmito|nougat|palets|schar melto|crackers|nut-thins|good thins|tartines|galettes|popcorn|kettle cooked|duo glacier|sprits|tablettes|mignonnette|happy digest|tartelettes?|sables|palmiers?|barres|wafer|biscotti|petit ecolier|biscuit|jordans|cote d''or'),
         (19,'conserves-legumes-fruits','corn|peas|beans|vegetables|carrots|beets|potatoes|spinach|epinards|flageolets|lentil|choux|petits pois|chick peas|garbanzo|bean salad|blackeye|ananas|pineapple|peach|pear|apricot|abricot|cherry|cerise|litchi|mango|mangu|fruit|mandarin|fraicheur des iles|st mamet|poires|yams|salade|pinto|poires')
       ) as r(ord, slug, pat)
      where p2.name ~* r.pat
      order by r.ord limit 1) as slug
  from public.products p2
  where p2.category_id = (select id from public.categories where slug = 'epicerie')
) t
where p.id = t.id and t.slug is not null and t.slug <> 'epicerie';
