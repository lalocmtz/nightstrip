const REQUIRED_PRODUCTION_ENV = [
  "SESSION_SECRET",
  "DATABASE_URL",
  "NOWPAYMENTS_API_KEY",
  "NOWPAYMENTS_IPN_SECRET",
  "NEXT_PUBLIC_APP_URL",
] as const;

export function isProductionRuntime(): boolean {
  if (process.env.VERCEL_ENV) return process.env.VERCEL_ENV === "production";
  return process.env.VERCEL === "1" && process.env.NODE_ENV === "production";
}

export function assertProductionEnv(): void {
  if (!isProductionRuntime()) return;
  const missing = REQUIRED_PRODUCTION_ENV.filter((key) => !process.env[key]?.trim());
  if (missing.length > 0) {
    throw new Error(`Missing required production environment: ${missing.join(", ")}`);
  }
}
