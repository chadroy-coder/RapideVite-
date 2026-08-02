import { listCustomersAdmin } from "@/lib/actions/admin-stats";
import { EmptyState } from "@/components/ui/EmptyState";
import { Users } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminCustomersPage() {
  const customers = await listCustomersAdmin();

  return (
    <div>
      <h1 className="font-bold text-2xl text-brand-ink mb-6">Clients</h1>
      {customers.length === 0 ? (
        <EmptyState icon={Users} title="Aucun client pour le moment" />
      ) : (
        <div className="bg-white border border-brand-border rounded-2xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-brand-gray border-b border-brand-border">
                <th className="px-4 py-3 font-medium">Nom</th>
                <th className="px-4 py-3 font-medium">Telephone</th>
                <th className="px-4 py-3 font-medium">Membre depuis</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} className="border-b border-brand-border last:border-0">
                  <td className="px-4 py-3 text-brand-ink font-medium">{c.full_name || "-"}</td>
                  <td className="px-4 py-3 text-brand-gray">{c.phone || "-"}</td>
                  <td className="px-4 py-3 text-brand-gray">{new Date(c.created_at).toLocaleDateString("fr-HT")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
