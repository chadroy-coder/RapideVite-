"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import type { Product, ProductVariant } from "@/types/database";
import { ProductCard } from "@/components/product/ProductCard";
import { loadMoreRecentProducts } from "@/lib/actions/recent-products";

type P = Product & { variants: ProductVariant[] };

export function RecentProductsFeed({ initial, pageSize = 12 }: { initial: P[]; pageSize?: number }) {
  const [items, setItems] = useState<P[]>(initial);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);
  const busy = useRef(false);

  const loadMore = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    setLoading(true);
    try {
      const res = await loadMoreRecentProducts(items.length, pageSize);
      const incoming = res.products as unknown as P[];
      setItems((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...incoming.filter((p) => !seen.has(p.id))];
      });
      setHasMore(res.hasMore);
    } catch {
      setHasMore(false);
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }, [items.length, pageSize]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasMore) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: "600px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, loadMore]);

  return (
    <>
      <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {items.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
      {hasMore && (
        <div ref={sentinel} className="flex justify-center py-6" aria-hidden>
          {loading && <Loader2 className="w-5 h-5 animate-spin text-brand-orange" />}
        </div>
      )}
    </>
  );
}
