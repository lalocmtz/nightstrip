import { NextResponse } from "next/server";
import { setAgeGate } from "@/lib/session";
import { hasAllowedOrigin } from "@/lib/request-security";

export async function POST(request: Request) {
  if (!hasAllowedOrigin(request)) {
    return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  }
  await setAgeGate();
  return NextResponse.json({ ok: true });
}
