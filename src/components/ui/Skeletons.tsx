export function ProductCardSkeleton() {
  return (
    <div className="rounded-2xl border border-brand-border overflow-hidden">
      <div className="skeleton aspect-square w-full" />
      <div className="p-3 space-y-2">
        <div className="skeleton h-3 w-3/4 rounded" />
        <div className="skeleton h-3 w-1/2 rounded" />
        <div className="skeleton h-4 w-1/3 rounded" />
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function CategoryPillsSkeleton() {
  return (
    <div className="flex gap-2 overflow-hidden px-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="skeleton h-8 w-24 rounded-full shrink-0" />
      ))}
    </div>
  );
}

export function RowSkeleton() {
  return <div className="skeleton h-14 w-full rounded-xl" />;
}
