import { NightstripApp } from "@/components/NightstripApp";
import { readBoard, serializeBoard } from "@/lib/board";
import { nowpaymentsConfigured } from "@/lib/nowpayments";
import { getWalletId } from "@/lib/session";
import { getWallet, withStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function Home() {
  const board = serializeBoard(await readBoard());
  const walletId = await getWalletId();
  const wallet = await withStore((state) => getWallet(state, walletId));
  return (
    <NightstripApp
      initialBoard={board}
      initialCredits={wallet.credits}
      demoPayments={!nowpaymentsConfigured()}
    />
  );
}
