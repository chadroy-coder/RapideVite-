import { redirect } from "next/navigation";
import { getCurrentUserAndProfile, getMyAddresses } from "@/lib/data";
import { AddressManager } from "@/components/account/AddressManager";

export default async function AddressesPage() {
  const { user } = await getCurrentUserAndProfile();
  if (!user) redirect("/login?redirect=/compte/adresses");

  const addresses = await getMyAddresses();

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <h1 className="font-bold text-xl text-brand-ink mb-1">Mes adresses</h1>
      <p className="text-brand-gray text-sm mb-6">
        Enregistrez vos adresses pour les retrouver au moment de la commande.
      </p>
      <AddressManager addresses={addresses} />
    </div>
  );
}
