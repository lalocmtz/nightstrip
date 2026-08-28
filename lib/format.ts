import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

export function newId(prefix = ""): string {
  const id = randomUUID().replace(/-/g, "").slice(0, 16);
  return prefix ? `${prefix}_${id}` : id;
}

export function signHmacSha512(secret: string, payload: string): string {
  return createHmac("sha512", secret).update(payload).digest("hex");
}

export function safeEqualHex(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export { usd, timeAgo } from "./money";
