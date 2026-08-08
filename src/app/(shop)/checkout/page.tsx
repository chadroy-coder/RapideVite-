import { redirect } from "next/navigation";
import { getCurrentUserAndProfile, getMyAddresses } from "@/lib/data";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import { getMySubscription } from "@/lib/actions/subscription";
import { isSubscriptionActive } from "@/lib/subscription-utils";

export default async function CheckoutPage() {
  const { user, profile } = await getCurrentUserAndProfile();
  // Check auth before rendering the form, not after the customer fills it
  // out and submits - placeOrder() would reject them anyway, but only after
  // wasting their time typing name/address/payment method.
  if (!user) redirect("/login?redirect=/checkout");

  const [addresses, subscription] = await Promise.all([getMyAddresses(), getMySubscription()]);
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
