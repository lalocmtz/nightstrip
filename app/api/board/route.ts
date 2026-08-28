import { NextResponse } from "next/server";
import { readBoard, serializeBoard } from "@/lib/board";

export const dynamic = "force-dynamic";

export async function GET() {
  const board = await readBoard();
  return NextResponse.json(serializeBoard(board));
}
