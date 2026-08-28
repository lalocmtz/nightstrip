import { NightstripApp } from "@/components/NightstripApp";
import { readBoard, serializeBoard } from "@/lib/board";
import { nowpaymentsConfigured } from "@/lib/nowpayments";
import { readWalletId } from "@/lib/session";
import { readStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function Home() {
  const board = serializeBoard(await readBoard());
  const walletId = await readWalletId();
  const credits = walletId
    ? await readStore(
        (state) => state.wallets.find((wallet) => wallet.id === walletId)?.credits ?? 0,
      )
    : 0;
  return (
    <NightstripApp
      initialBoard={board}
      initialCredits={credits}
      demoPayments={!nowpaymentsConfigured()}
    />
  );
}
