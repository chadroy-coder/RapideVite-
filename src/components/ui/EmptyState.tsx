import { type LucideIcon, PackageSearch } from "lucide-react";
import Link from "next/link";

export function EmptyState({
  icon: Icon = PackageSearch,
  title,
  description,
  actionLabel,
  actionHref,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <div className="w-16 h-16 rounded-full bg-brand-cream flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-brand-orange" />
      </div>
      <h3 className="font-semibold text-brand-ink text-lg">{title}</h3>
      {description && <p className="text-brand-gray text-sm mt-1 max-w-xs">{description}</p>}
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="mt-5 inline-flex items-center justify-center rounded-full bg-brand-orange text-white text-sm font-semibold px-6 py-2.5 hover:bg-brand-orange-dark transition"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
