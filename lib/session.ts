import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const WALLET_COOKIE = "ns_wallet";
const AGE_COOKIE = "ns_18";
const WEEK = 60 * 60 * 24 * 7;

function sessionSecret(): string {
  return process.env.SESSION_SECRET || "nightstrip-demo-session";
}

function sign(value: string): string {
  const mac = createHmac("sha256", sessionSecret()).update(value).digest("hex");
  return `${value}.${mac}`;
}

function unsign(raw: string | undefined): string | null {
  if (!raw) return null;
  const idx = raw.lastIndexOf(".");
  if (idx <= 0) return null;
  const value = raw.slice(0, idx);
  const mac = raw.slice(idx + 1);
  const expected = createHmac("sha256", sessionSecret()).update(value).digest("hex");
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return null;
  if (!timingSafeEqual(a, b)) return null;
  return value;
}

export async function getWalletId(): Promise<string> {
  const jar = await cookies();
  const existing = unsign(jar.get(WALLET_COOKIE)?.value);
  if (existing) return existing;
  const id = randomUUID();
  jar.set(WALLET_COOKIE, sign(id), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: WEEK * 8,
  });
  return id;
}

export async function hasAgeGate(): Promise<boolean> {
  const jar = await cookies();
  return jar.get(AGE_COOKIE)?.value === "1";
}

export async function setAgeGate(): Promise<void> {
  const jar = await cookies();
  jar.set(AGE_COOKIE, "1", {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: WEEK * 52,
  });
}

export const COOKIE = { WALLET_COOKIE, AGE_COOKIE };
