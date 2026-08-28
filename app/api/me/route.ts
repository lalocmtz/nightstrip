import { NextResponse } from "next/server";
import { demoPaymentsEnabled } from "@/lib/nowpayments";
import { getWalletId } from "@/lib/session";
import { readStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const walletId = await getWalletId();
  const wallet = await readStore((state) =>
    state.wallets.find((item) => item.id === walletId),
  );
  return NextResponse.json({
    credits: wallet?.credits ?? 0,
    demoPayments: demoPaymentsEnabled(),
    demoGranted: wallet?.demoGranted ?? false,
  });
}
