import { requireStaff } from "@/lib/require-staff";
import { InventoryRow } from "@/components/admin/InventoryRow";
import { formatUSD } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminInventoryPage() {
  const { supabase } = await requireStaff();
  const { data: variants } = await supabase
    .from("product_variants")
    .select("*, product:products(name, image_url)")
    .order("inventory_quantity", { ascending: true });

  return (
    <div>
      <h1 className="font-bold text-2xl text-brand-ink mb-6">Inventaire</h1>
      <div className="bg-white border border-brand-border rounded-2xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-brand-gray border-b border-brand-border">
              <th className="px-4 py-3 font-medium">Produit</th>
              <th className="px-4 py-3 font-medium">SKU</th>
              <th className="px-4 py-3 font-medium">Prix</th>
              <th className="px-4 py-3 font-medium">Stock actuel</th>
              <th className="px-4 py-3 font-medium">Quantite / Seuil</th>
            </tr>
          </thead>
          <tbody>
            {(variants ?? []).map((v) => {
              const low = v.inventory_quantity <= v.low_stock_threshold;
              return (
                <tr key={v.id} className="border-b border-brand-border last:border-0">
                  <td className="px-4 py-3 text-brand-ink font-medium">
                    {(v.product as unknown as { name: string } | null)?.name ?? "Produit"} {v.size ? `(${v.size})` : ""}
                  </td>
                  <td className="px-4 py-3 text-brand-gray">{v.sku}</td>
                  <td className="px-4 py-3 text-brand-ink">{formatUSD(v.selling_price)}</td>
                  <td className="px-4 py-3">
                    <span className={low ? "text-amber-600 font-semibold" : "text-brand-ink"}>{v.inventory_quantity}</span>
                  </td>
                  <td className="px-4 py-3">
                    <InventoryRow variantId={v.id} initialQuantity={v.inventory_quantity} initialThreshold={v.low_stock_threshold} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
