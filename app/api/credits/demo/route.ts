import { NextResponse } from "next/server";
import { DEMO_GRANT_USD } from "@/lib/constants";
import { demoPaymentsEnabled } from "@/lib/nowpayments";
import { grantDemoCredits } from "@/lib/claim";
import { getWalletId } from "@/lib/session";
import { hasAllowedOrigin } from "@/lib/request-security";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!hasAllowedOrigin(request)) {
    return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  }
  if (!demoPaymentsEnabled()) {
    return NextResponse.json(
      { error: "Demo credits are available only in local development." },
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
