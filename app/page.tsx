import { NightstripApp } from "@/components/NightstripApp";
import { boardFromState, cacheBoard, serializeBoard } from "@/lib/board";
import { demoPaymentsEnabled } from "@/lib/nowpayments";
import { readWalletId } from "@/lib/session";
import { readStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function Home() {
  const walletId = await readWalletId();
  const home = await readStore((state) => ({
    board: boardFromState(state),
    credits: walletId
      ? state.wallets.find((wallet) => wallet.id === walletId)?.credits ?? 0
      : 0,
  }));
  cacheBoard(home.board);
  return (
    <NightstripApp
      initialBoard={serializeBoard(home.board)}
      initialCredits={home.credits}
      demoPayments={demoPaymentsEnabled()}
    />
  );
}
