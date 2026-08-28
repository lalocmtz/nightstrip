import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * NOWPayments IPN: HMAC-SHA512 of JSON.stringify(body, Object.keys(body).sort())
 * using the IPN secret. Official Node recipe from NOWPayments docs.
 */
export function nowpaymentsSignaturePayload(body: unknown): string {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return JSON.stringify(body);
  }
  const record = body as Record<string, unknown>;
  return JSON.stringify(record, Object.keys(record).sort());
}

export function signNowpaymentsBody(ipnSecret: string, body: unknown): string {
  const payload = nowpaymentsSignaturePayload(body);
  return createHmac("sha512", ipnSecret).update(payload).digest("hex");
}

export function verifyNowpaymentsSignature(input: {
  ipnSecret: string;
  signature: string | null;
  body: unknown;
}): boolean {
  if (!input.signature) return false;
  const expected = signNowpaymentsBody(input.ipnSecret, input.body);
  const left = Buffer.from(expected);
  const right = Buffer.from(input.signature);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function nowpaymentsConfigured(): boolean {
  return Boolean(
    process.env.NOWPAYMENTS_API_KEY && process.env.NOWPAYMENTS_IPN_SECRET,
  );
}

export function nowpaymentsApiBase(): string {
  return process.env.NOWPAYMENTS_SANDBOX === "true"
    ? "https://api-sandbox.nowpayments.io/v1"
    : "https://api.nowpayments.io/v1";
}

export type NowpaymentsInvoice = {
  id: string | number;
  invoice_url?: string;
};

export async function createNowpaymentsInvoice(input: {
  priceAmount: number;
  orderId: string;
  description: string;
  successUrl: string;
  cancelUrl: string;
  ipnCallbackUrl: string;
}): Promise<{ invoiceUrl: string; invoiceId: string }> {
  const apiKey = process.env.NOWPAYMENTS_API_KEY;
  if (!apiKey) {
    throw new Error("NOWPAYMENTS_API_KEY missing");
  }

  const res = await fetch(`${nowpaymentsApiBase()}/invoice`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({
      price_amount: input.priceAmount,
      price_currency: "usd",
      order_id: input.orderId,
      order_description: input.description,
      ipn_callback_url: input.ipnCallbackUrl,
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`NOWPayments invoice failed: ${res.status} ${text}`);
  }

  const data = (await res.json()) as NowpaymentsInvoice;
  const invoiceUrl = data.invoice_url;
  if (!invoiceUrl) {
    throw new Error("NOWPayments invoice missing invoice_url");
  }
  return { invoiceUrl, invoiceId: String(data.id) };
}

export function isPaidStatus(status: string | undefined): boolean {
  return status === "finished" || status === "confirmed";
}
