import Link from "next/link";
import {
  CupSoda,
  Droplet,
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
  type LucideIcon,
} from "lucide-react";
import type { Category } from "@/types/database";

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  boissons: CupSoda,
  eau: Droplet,
  collations: Cookie,
  epicerie: ShoppingBasket,
  "produits-menagers": SprayCan,
  "soins-personnels": Sparkles,
  "produits-bebe": Baby,
  "produits-surgeles": Snowflake,
  "fruits-legumes": Apple,
  "pain-petit-dejeuner": Croissant,
  "credit-telephone": Smartphone,
  promotions: Tag,
  "alcool-spiritueux": Wine,
  fleurs: Flower2,
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
