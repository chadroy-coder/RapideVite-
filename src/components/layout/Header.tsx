"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, ShoppingCart, MapPin, User } from "lucide-react";
import { useState } from "react";
import { useCartStore } from "@/store/cart-store";
import { Logo } from "@/components/layout/Logo";

export function Header({ isAuthed }: { isAuthed: boolean }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const itemCount = useCartStore((s) => s.itemCount());
  const toggleCart = useCartStore((s) => s.toggleCart);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) router.push(`/recherche?q=${encodeURIComponent(query.trim())}`);
  }

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-brand-border">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <Logo className="w-9 h-9 shrink-0" />
          <span className="hidden sm:block font-extrabold text-brand-ink text-lg">RapideVite</span>
        </Link>

        <button className="hidden md:flex items-center gap-1.5 text-sm text-brand-gray border border-brand-border rounded-full px-3 py-2 hover:border-brand-orange transition">
          <MapPin className="w-4 h-4 text-brand-orange" />
          <span className="max-w-[160px] truncate">Choisir l&apos;adresse</span>
        </button>

        <form onSubmit={handleSearch} className="flex-1 relative">
          <Search className="w-4 h-4 text-brand-gray absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            type="search"
            placeholder="Rechercher un produit..."
            className="w-full bg-brand-cream rounded-full pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-orange/40"
          />
        </form>

        <Link
          href={isAuthed ? "/compte" : "/login"}
          className="hidden sm:flex items-center gap-1.5 text-sm font-medium text-brand-ink hover:text-brand-orange transition shrink-0"
        >
          <User className="w-5 h-5" />
        </Link>

        <button onClick={toggleCart} className="relative shrink-0" aria-label="Ouvrir le panier">
          <ShoppingCart className="w-6 h-6 text-brand-ink" />
          {itemCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-brand-orange text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
              {itemCount > 9 ? "9+" : itemCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
