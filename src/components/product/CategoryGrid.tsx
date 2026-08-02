import Link from "next/link";
import { Package } from "lucide-react";
import type { Category } from "@/types/database";
import { CATEGORY_ICONS } from "./CategoryCarousel";

export function CategoryGrid({ categories }: { categories: Category[] }) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
      {categories.map((c) => {
        const Icon = CATEGORY_ICONS[c.slug] ?? Package;
        return (
          <Link
            key={c.id}
            href={`/categorie/${c.slug}`}
            className="group flex flex-col items-center gap-2 p-4 rounded-2xl bg-brand-cream border border-brand-border hover:bg-brand-orange hover:border-brand-orange hover:shadow-md transition"
          >
            <span className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center transition">
              <Icon className="w-6 h-6 text-brand-orange transition group-hover:text-brand-orange" strokeWidth={2} />
            </span>
            <span className="text-sm font-medium text-brand-ink text-center leading-tight line-clamp-2 group-hover:text-white transition">
              {c.name}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
