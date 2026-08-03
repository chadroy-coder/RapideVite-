import { Suspense } from "react";
import Link from "next/link";
import { MapPin, ChevronRight } from "lucide-react";
import {
  getCategories,
  getCategoriesWithProducts,
  getFeaturedProducts,
  getPromotionProducts,
  getRecentProducts,
} from "@/lib/data";
import { CategoryCarousel } from "@/components/product/CategoryCarousel";
import { ProductCard } from "@/components/product/ProductCard";
import { ProductGridSkeleton, CategoryPillsSkeleton } from "@/components/ui/Skeletons";
import type { Product, ProductVariant } from "@/types/database";

export const revalidate = 60;

async function CategoriesSection() {
  const categories = await getCategories();
  if (categories.length === 0) return null;
  return <CategoryCarousel categories={categories} />;
}

function ProductGrid({ products }: { products: (Product & { variants: ProductVariant[] })[] }) {
  if (products.length === 0) return null;
  return (
    <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}

async function FeaturedSection() {
  const products = await getFeaturedProducts();
  if (products.length === 0) return null;
  return (
    <section className="px-4 py-5">
      <h2 className="font-bold text-lg text-brand-ink mb-3">Produits vedettes</h2>
      <ProductGrid products={products as (Product & { variants: ProductVariant[] })[]} />
    </section>
  );
}

async function PromotionsSection() {
  const products = await getPromotionProducts();
  if (products.length === 0) return null;
  return (
    <section className="px-4 py-5">
      <h2 className="font-bold text-lg text-brand-ink mb-3">Promotions en cours</h2>
      <ProductGrid products={products as (Product & { variants: ProductVariant[] })[]} />
    </section>
  );
}

async function RecentSection() {
  const products = await getRecentProducts();
  if (products.length === 0) return null;
  return (
    <section className="px-4 py-5">
      <h2 className="font-bold text-lg text-brand-orange mb-3">Ajoutes recemment</h2>
      <ProductGrid products={products as (Product & { variants: ProductVariant[] })[]} />
    </section>
  );
}

async function CategorySections() {
  const sections = await getCategoriesWithProducts(8);
  if (sections.length === 0) return null;
  return (
    <>
      {sections.map(({ category, products }, i) => (
        <section
          key={category.id}
          className={i % 2 === 1 ? "px-4 py-5 bg-brand-cream/50" : "px-4 py-5"}
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-lg text-brand-orange">{category.name}</h2>
            <Link
              href={`/categorie/${category.slug}`}
              className="inline-flex items-center gap-0.5 text-sm font-semibold text-brand-orange hover:underline"
            >
              Voir tout
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <ProductGrid products={products} />
        </section>
      ))}
    </>
  );
}

export default function HomePage() {
  return (
    <div className="max-w-6xl mx-auto">
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-cream to-white">
        <div
          aria-hidden
          className="absolute -top-16 -left-16 w-56 h-56 rounded-full bg-brand-orange/10 blur-3xl"
        />
        <div
          aria-hidden
          className="absolute -bottom-20 -right-10 w-64 h-64 rounded-full bg-brand-green/10 blur-3xl"
        />
        <div className="relative px-4 pt-12 pb-10 max-w-xl mx-auto text-center">
          <span className="inline-flex items-center gap-1.5 bg-white border border-brand-orange/20 text-brand-orange font-semibold text-xs px-3.5 py-1.5 rounded-full shadow-sm">
            <MapPin className="w-3.5 h-3.5" />
            <span aria-hidden>🇭🇹</span>
            Port-au-Prince, Haiti · Livraison en moins d&apos;une heure
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-brand-ink mt-4 leading-tight">
            Tout sa w bezwen, rapid vit.
          </h1>
          <p className="text-brand-gray text-base mt-3">
            On livre directement chez vous, partout a Port-au-Prince.
          </p>
        </div>
      </section>

      <div className="py-4">
        <Suspense fallback={<CategoryPillsSkeleton />}>
          <CategoriesSection />
        </Suspense>
      </div>

      <Suspense fallback={<div className="px-4"><ProductGridSkeleton /></div>}>
        <FeaturedSection />
      </Suspense>

      <Suspense fallback={<div className="px-4"><ProductGridSkeleton /></div>}>
        <PromotionsSection />
      </Suspense>

      <Suspense
        fallback={
          <div className="px-4 space-y-6">
            <ProductGridSkeleton />
            <ProductGridSkeleton />
          </div>
        }
      >
        <CategorySections />
      </Suspense>

      <Suspense fallback={<div className="px-4"><ProductGridSkeleton /></div>}>
        <RecentSection />
      </Suspense>
    </div>
  );
}
