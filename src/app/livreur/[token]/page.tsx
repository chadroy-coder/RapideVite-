import { notFound } from "next/navigation";
import { getOrderForDriver } from "@/lib/actions/driver";
import { DriverConsole } from "@/components/driver/DriverConsole";

// Public page - intentionally no auth/staff check here. Access is gated by
// the unguessable token in the URL, validated server-side against
// orders.driver_access_token in getOrderForDriver(). See src/lib/actions/driver.ts.
export const dynamic = "force-dynamic";

export default async function DriverOrderPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await getOrderForDriver(token);
  if (!result) notFound();

  const { order, items } = result;

  return (
    <DriverConsole
      token={token}
      orderNumber={order.order_number}
      customerName={order.customer_name}
      street={order.street}
      commune={order.commune}
      initialItems={items}
    />
  );
}
