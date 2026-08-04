import { getCurrentUserAndProfile, getMyAddresses } from "@/lib/data";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import { getMySubscription } from "@/lib/actions/subscription";
import { isSubscriptionActive } from "@/lib/subscription-utils";

export default async function CheckoutPage() {
  const [{ profile }, addresses, subscription] = await Promise.all([
    getCurrentUserAndProfile(),
    getMyAddresses(),
    getMySubscription(),
  ]);
  const defaultAddress = addresses[0];

  return (
    <CheckoutForm
      isPlusMember={isSubscriptionActive(subscription)}
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
