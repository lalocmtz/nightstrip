import { NextResponse } from "next/server";
import { nowpaymentsConfigured } from "@/lib/nowpayments";
import { getWalletId } from "@/lib/session";
import { getWallet, withStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const walletId = await getWalletId();
  const wallet = await withStore((state) => getWallet(state, walletId));
  return NextResponse.json({
    credits: wallet.credits,
    demoPayments: !nowpaymentsConfigured(),
    demoGranted: wallet.demoGranted,
  });
}
