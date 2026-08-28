import { NextResponse } from "next/server";
import { hasAgeGate } from "@/lib/session";
import { withStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const allowed = await hasAgeGate();

  const result = await withStore((state) => {
    const listing = state.listings.find((item) => item.id === id);
    if (!listing) return { error: "not_found" as const };
    if (listing.district === "red" && !allowed) {
      return { gate: true as const };
    }
    listing.clicks += 1;
    return { url: listing.url };
  });

  if ("error" in result) {
    return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  }
  if ("gate" in result) {
    return NextResponse.redirect(new URL(`/v/${id}`, request.url));
  }
  return NextResponse.redirect(result.url, 302);
}
