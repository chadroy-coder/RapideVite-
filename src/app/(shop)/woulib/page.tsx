import { redirect } from "next/navigation";
import { getCurrentUserAndProfile } from "@/lib/data";
import { getVehicleTypes } from "@/lib/actions/woulib";
import { WoulibRequestForm } from "@/components/woulib/WoulibRequestForm";

export default async function WoulibPage() {
  const { user } = await getCurrentUserAndProfile();
  // Same reasoning as checkout: reject before the customer fills out the
  // form, not after they submit and createWoulibRequest() bounces them.
  if (!user) redirect("/login?redirect=/woulib");

  const vehicleTypes = await getVehicleTypes();

  return <WoulibRequestForm vehicleTypes={vehicleTypes} />;
}
