import { NextResponse } from "next/server";
import { DEMO_GRANT_USD } from "@/lib/constants";
import { nowpaymentsConfigured } from "@/lib/nowpayments";
import { grantDemoCredits } from "@/lib/claim";
import { getWalletId } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST() {
  if (nowpaymentsConfigured()) {
    return NextResponse.json(
      { error: "Demo credits are disabled while NOWPayments is configured." },
      { status: 403 },
    );
  }
  const walletId = await getWalletId();
  const result = await grantDemoCredits(walletId);
  return NextResponse.json({
    credits: result.credits,
    granted: DEMO_GRANT_USD,
  });
}
