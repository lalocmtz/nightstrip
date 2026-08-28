import { NextResponse } from "next/server";
import { isDistrict } from "@/lib/constants";
import { quoteFor } from "@/lib/claim";
import { getWalletId } from "@/lib/session";
import { readStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const district = url.searchParams.get("district");
  const requestedBid = url.searchParams.get("bid");
  const targetListingId = url.searchParams.get("target") ?? undefined;
  if (!isDistrict(district)) {
    return NextResponse.json({ error: "Unknown district." }, { status: 400 });
  }
  const walletId = await getWalletId();
  const quote = await readStore((state) =>
    quoteFor(
      state.listings,
      district,
      walletId,
      requestedBid ? Number(requestedBid) : undefined,
      targetListingId,
    ),
  );
  return NextResponse.json(quote);
}
