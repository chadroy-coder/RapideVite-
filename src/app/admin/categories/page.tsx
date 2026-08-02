import Link from "next/link";
import { Plus } from "lucide-react";
import { listCategoriesAdmin } from "@/lib/actions/admin-categories";
import { CategoryRowActions } from "@/components/admin/CategoryRowActions";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  const categories = await listCategoriesAdmin();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-bold text-2xl text-brand-ink">Categories</h1>
        <Link href="/admin/categories/nouveau" className="flex items-center gap-2 rounded-full bg-brand-orange text-white text-sm font-semibold px-5 py-2.5 hover:bg-brand-orange-dark transition">
          <Plus className="w-4 h-4" /> Ajouter
        </Link>
      </div>

      <div className="bg-white border border-brand-border rounded-2xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-brand-gray border-b border-brand-border">
              <th className="px-4 py-3 font-medium">Nom</th>
              <th className="px-4 py-3 font-medium">Slug</th>
              <th className="px-4 py-3 font-medium">Ordre</th>
              <th className="px-4 py-3 font-medium">Statut</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.id} className="border-b border-brand-border last:border-0">
                <td className="px-4 py-3">
                  <Link href={`/admin/categories/${c.id}`} className="font-medium text-brand-ink hover:text-brand-orange">
                    {c.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-brand-gray">{c.slug}</td>
                <td className="px-4 py-3 text-brand-gray">{c.sort_order}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${c.active ? "bg-green-50 text-brand-green" : "bg-gray-100 text-brand-gray"}`}>
                    {c.active ? "Active" : "Masquee"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <CategoryRowActions id={c.id} active={c.active} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
