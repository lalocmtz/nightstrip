import { NextResponse } from "next/server";
import { processNowpaymentsIpn } from "@/lib/ipn";
import { verifyNowpaymentsSignature } from "@/lib/nowpayments";
import { withStore } from "@/lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const secret = process.env.NOWPAYMENTS_IPN_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "IPN secret not configured." }, { status: 501 });
  }
  if (!process.env.DATABASE_URL) {
    // Return a retryable error instead of acknowledging a paid invoice that
    // cannot yet be committed to durable storage.
    return NextResponse.json({ error: "Durable store not configured." }, { status: 503 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const signature = request.headers.get("x-nowpayments-sig");
  if (!verifyNowpaymentsSignature({ ipnSecret: secret, signature, body })) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  const paymentId = String(body.payment_id ?? body.id ?? "");
  if (!paymentId) {
    return NextResponse.json({ error: "Missing payment_id." }, { status: 400 });
  }
  const status = String(body.payment_status ?? "").toLowerCase();
  if (status !== "finished") {
    return NextResponse.json({ ok: true, ignored: status || "unknown_status" });
  }

  const result = await withStore((state) => processNowpaymentsIpn(state, body));
  if (
    "ignored" in result &&
    (result.ignored === "unknown_order" || result.ignored === "amount_mismatch")
  ) {
    console.error("nowpayments_ipn_reconciliation_required", {
      paymentId,
      orderId: String(body.order_id ?? ""),
      reason: result.ignored,
    });
  }
  return NextResponse.json({ ok: true, ...result });
}
