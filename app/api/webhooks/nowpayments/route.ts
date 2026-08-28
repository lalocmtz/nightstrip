import { NextResponse } from "next/server";
import { commitClaim } from "@/lib/claim";
import { isPaidStatus, verifyNowpaymentsSignature } from "@/lib/nowpayments";
import { getWallet, withStore } from "@/lib/store";

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
  const orderId = String(body.order_id ?? "");
  const status = String(body.payment_status ?? "");

  if (!paymentId) {
    return NextResponse.json({ error: "Missing payment_id." }, { status: 400 });
  }

  const result = await withStore((state) => {
    if (state.processedIpnIds.includes(paymentId)) {
      return { idempotent: true as const };
    }
    // Record the IPN even for non-paid statuses so retries stay cheap,
    // but only apply the claim when paid.
    if (!isPaidStatus(status)) {
      return { ignored: status };
    }

    const pending = state.pendingClaims.find((item) => item.orderId === orderId);
    if (!pending) {
      return { missing: true as const };
    }

    state.processedIpnIds.push(paymentId);
    state.processedIpnIds = state.processedIpnIds.slice(-2000);
    state.pendingClaims = state.pendingClaims.filter((item) => item.orderId !== orderId);
    getWallet(state, pending.walletId);

    const receipt = commitClaim(state, {
      walletId: pending.walletId,
      district: pending.district,
      identity: {
        name: pending.name,
        handle: pending.handle,
        url: pending.url,
      },
      bid: pending.bid,
      amountPaid: pending.amountDue,
      demo: false,
    });

    return { receiptId: receipt.id };
  });

  if ("missing" in result && result.missing) {
    // Paid, but we cannot match an order — still 200 so NOWPayments does not retry forever
    // after we already persisted the payment id on a later retry. Return 200 with ignored.
    return NextResponse.json({ ok: true, ignored: "unknown_order" });
  }

  return NextResponse.json({ ok: true, ...result });
}
