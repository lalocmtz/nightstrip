import { notFound } from "next/navigation";
import { hasAgeGate } from "@/lib/session";
import { readStore } from "@/lib/store";
import { LeaveGate } from "@/components/LeaveGate";

export const dynamic = "force-dynamic";

export default async function VisitPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const listing = await readStore((state) =>
    state.listings.find((item) => item.id === id),
  );
  if (!listing) notFound();
  const aged = await hasAgeGate();
  return (
    <LeaveGate
      id={listing.id}
      name={listing.name}
      district={listing.district}
      url={listing.url}
      aged={aged}
    />
  );
}
