import Link from "next/link";
import {
  CupSoda,
  Cookie,
  ShoppingBasket,
  SprayCan,
  Sparkles,
  Baby,
  Snowflake,
  Apple,
  Croissant,
  Smartphone,
  Tag,
  Wine,
  Flower2,
  Package,
  Beef,
  Milk,
  Fish,
  Coffee,
  Pill,
  FileText,
  ChefHat,
  PawPrint,
  type LucideIcon,
} from "lucide-react";
import type { Category } from "@/types/database";

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  boissons: CupSoda,
  "collations-friandises": Cookie,
  epicerie: ShoppingBasket,
  "produits-menagers": SprayCan,
  "hygiene-soins-personnels": Sparkles,
  "produits-bebe": Baby,
  "produits-surgeles": Snowflake,
  "fruits-legumes": Apple,
  "pain-patisserie": Croissant,
  "electronique-accessoires": Smartphone,
  promotions: Tag,
  "alcools-spiritueux": Wine,
  fleurs: Flower2,
  "viandes-charcuterie": Beef,
  "produits-laitiers-oeufs": Milk,
  "poissons-fruits-de-mer": Fish,
  "petit-dejeuner": Coffee,
  "sante-pharmacie": Pill,
  "papier-produits-jetables": FileText,
  "cuisine-maison": ChefHat,
  "produits-animaux": PawPrint,
};

export function CategoryCarousel({ categories }: { categories: Category[] }) {
  return (
    <div className="flex gap-3 overflow-x-auto px-4 pb-1 no-scrollbar">
      {categories.map((c) => {
        const Icon = CATEGORY_ICONS[c.slug] ?? Package;
        return (
          <Link
            key={c.id}
            href={`/categorie/${c.slug}`}
            className="group shrink-0 flex flex-col items-center gap-1.5 w-20"
          >
            <span className="w-14 h-14 rounded-2xl bg-brand-orange/10 border border-brand-orange/10 flex items-center justify-center transition group-hover:bg-brand-orange group-hover:border-brand-orange group-hover:shadow-md">
              <Icon className="w-6 h-6 text-brand-orange transition group-hover:text-white" strokeWidth={2} />
            </span>
            <span className="text-xs font-medium text-brand-ink text-center leading-tight line-clamp-2">
              {c.name}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
