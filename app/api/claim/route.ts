import { NextResponse } from "next/server";
import { isDistrict } from "@/lib/constants";
import { performClaim } from "@/lib/claim";
import { getWalletId } from "@/lib/session";
import { claimRateLimit, hasAllowedOrigin } from "@/lib/request-security";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (process.env.VERCEL_ENV === "preview") {
    return NextResponse.json(
      { error: "Claims are disabled in preview environments." },
      { status: 503 },
    );
  }
  if (process.env.DISABLE_CLAIMS === "1") {
    return NextResponse.json(
      { error: "Claims are temporarily paused." },
      { status: 503 },
    );
  }
  if (!hasAllowedOrigin(request)) {
    return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  }
  const rate = claimRateLimit(request);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Too many claim attempts. Please try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(rate.retryAfterSeconds) },
      },
    );
  }
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 16_384) {
    return NextResponse.json({ error: "Request is too large." }, { status: 413 });
  }

  let body: {
    district?: string;
    name?: string;
    url?: string;
    bid?: number;
    targetListingId?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  if (!isDistrict(body.district)) {
    return NextResponse.json({ error: "Unknown district." }, { status: 400 });
  }
  if (!body.name || typeof body.name !== "string") {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }

  const walletId = await getWalletId();
  const result = await performClaim({
    walletId,
    district: body.district,
    name: body.name,
    url: typeof body.url === "string" ? body.url : undefined,
    requestedBid: typeof body.bid === "number" ? body.bid : undefined,
    targetListingId:
      typeof body.targetListingId === "string" ? body.targetListingId : undefined,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  if ("payUrl" in result) {
    return NextResponse.json({ payUrl: result.payUrl });
  }
  const { walletId: _walletId, ...receipt } = result.receipt;
  void _walletId;
  return NextResponse.json({
    receipt,
    receiptUrl: `/r/${result.receipt.id}`,
  });
}
