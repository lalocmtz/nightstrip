const CLAIM_WINDOW_MS = 10 * 60 * 1000;
const CLAIM_LIMIT = 5;
const MAX_RATE_LIMIT_KEYS = 5_000;

type RateEntry = { count: number; resetsAt: number };
type SecurityGlobals = typeof globalThis & {
  __nightstripClaimRate?: Map<string, RateEntry>;
};

export function hasAllowedOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  try {
    const received = new URL(origin).origin;
    const requestOrigin = new URL(request.url).origin;
    const configured = process.env.NEXT_PUBLIC_APP_URL
      ? new URL(process.env.NEXT_PUBLIC_APP_URL).origin
      : null;
    return received === requestOrigin || received === configured;
  } catch {
    return false;
  }
}

export function claimRateLimit(request: Request, now = Date.now()): {
  allowed: boolean;
  retryAfterSeconds: number;
} {
  const globals = globalThis as SecurityGlobals;
  const entries = (globals.__nightstripClaimRate ??= new Map());
  for (const [key, entry] of entries) {
    if (entry.resetsAt <= now) entries.delete(key);
  }

  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const key = forwarded || request.headers.get("x-real-ip") || "unknown";
  const current = entries.get(key);
  if (!current || current.resetsAt <= now) {
    if (entries.size >= MAX_RATE_LIMIT_KEYS) {
      const oldest = entries.keys().next().value as string | undefined;
      if (oldest) entries.delete(oldest);
    }
    entries.set(key, { count: 1, resetsAt: now + CLAIM_WINDOW_MS });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  current.count += 1;
  if (current.count <= CLAIM_LIMIT) {
    return { allowed: true, retryAfterSeconds: 0 };
  }
  return {
    allowed: false,
    retryAfterSeconds: Math.max(1, Math.ceil((current.resetsAt - now) / 1000)),
  };
}
