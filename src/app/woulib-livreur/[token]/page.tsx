import { notFound } from "next/navigation";
import { getWoulibRequestForDriver } from "@/lib/actions/woulib-driver";
import { WoulibDriverConsole } from "@/components/woulib/WoulibDriverConsole";

// Public page - intentionally no auth/staff check here. Access is gated by
// the unguessable token in the URL, validated server-side against
// woulib_requests.driver_access_token in getWoulibRequestForDriver(). Same
// pattern as /livreur/[token] for grocery orders.
export const dynamic = "force-dynamic";

export default async function WoulibDriverPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const request = await getWoulibRequestForDriver(token);
  if (!request) notFound();

  return (
    <WoulibDriverConsole
      token={token}
      requestNumber={request.request_number}
      serviceType={request.service_type}
      contactName={request.contact_name}
      contactPhone={request.contact_phone}
      pickupAddress={request.pickup_address}
      pickupLat={request.pickup_lat}
      pickupLng={request.pickup_lng}
      dropoffAddress={request.dropoff_address}
      dropoffLat={request.dropoff_lat}
      dropoffLng={request.dropoff_lng}
      packageDescription={request.package_description}
      notes={request.notes}
      paymentMethod={request.payment_method}
      price={request.final_price ?? request.estimated_price}
      initialStatus={request.status}
    />
  );
}
