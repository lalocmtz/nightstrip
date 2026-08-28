import { NightstripApp } from "@/components/NightstripApp";
import { readBoard, serializeBoard } from "@/lib/board";
import { nowpaymentsConfigured } from "@/lib/nowpayments";

export const dynamic = "force-dynamic";

export default async function Home() {
  const board = serializeBoard(await readBoard());
  return (
    <NightstripApp
      initialBoard={board}
      initialCredits={0}
      demoPayments={!nowpaymentsConfigured()}
    />
  );
}
