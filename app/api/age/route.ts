import { NextResponse } from "next/server";
import { setAgeGate } from "@/lib/session";

export async function POST() {
  await setAgeGate();
  return NextResponse.json({ ok: true });
}
