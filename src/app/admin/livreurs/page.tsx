import { listDrivers } from "@/lib/actions/admin-drivers";
import { DriverManager } from "@/components/admin/DriverManager";

export default async function AdminDriversPage() {
  const drivers = await listDrivers();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-bold text-2xl text-brand-ink">Livreurs</h1>
        <p className="text-brand-gray text-sm mt-1">
          Gerez votre equipe de livraison. Assignez-les aux commandes depuis la page de chaque commande.
        </p>
      </div>
      <DriverManager drivers={drivers} />
    </div>
  );
}
