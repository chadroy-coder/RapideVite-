import { getCurrentUserAndProfile, getMyAddresses } from "@/lib/data";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";

export default async function CheckoutPage() {
  const [{ profile }, addresses] = await Promise.all([getCurrentUserAndProfile(), getMyAddresses()]);
  const defaultAddress = addresses[0];

  return (
    <CheckoutForm
      initialValues={{
        customer_name: profile?.full_name ?? "",
        customer_phone: profile?.phone ?? "",
        department: defaultAddress?.department ?? "",
        commune: defaultAddress?.commune ?? "",
        neighborhood: defaultAddress?.neighborhood ?? "",
        street: defaultAddress?.street ?? "",
        delivery_instructions: defaultAddress?.delivery_instructions ?? "",
      }}
    />
  );
}
