import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { neon } from "@neondatabase/serverless";
import { assertProductionEnv } from "./env";
import type { StoreState, Wallet } from "./types";

assertProductionEnv();

const EMPTY: StoreState = {
  listings: [],
  wallets: [],
  receipts: [],
  pendingClaims: [],
  processedIpnIds: [],
  orphanIpns: [],
  allTimePot: 0,
};

type GlobalStore = {
  state: StoreState;
  chain: Promise<unknown>;
};

function memorySlot(): GlobalStore {
  const g = globalThis as typeof globalThis & { __nightstrip?: GlobalStore };
  if (!g.__nightstrip) {
    g.__nightstrip = { state: structuredClone(EMPTY), chain: Promise.resolve() };
  }
  return g.__nightstrip;
}

function filePath(): string {
  if (process.env.VERCEL) {
    return path.join("/tmp", "nightstrip-store.json");
  }
  return path.join(process.cwd(), "data", "store.json");
}

async function readFileStore(): Promise<StoreState> {
  try {
    const raw = await readFile(filePath(), "utf8");
    return hydrateState(JSON.parse(raw) as Partial<StoreState>);
  } catch {
    return structuredClone(EMPTY);
  }
}

async function writeFileStore(state: StoreState): Promise<void> {
  const target = filePath();
  await mkdir(path.dirname(target), { recursive: true });
  const tmp = `${target}.${process.pid}.tmp`;
  await writeFile(tmp, JSON.stringify(state), "utf8");
  const { rename } = await import("node:fs/promises");
  await rename(tmp, target);
}

function db() {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  return neon(url);
}

type Sql = NonNullable<ReturnType<typeof db>>;

type StoreGlobals = typeof globalThis & {
  __nightstripTablesReady?: Promise<void>;
};

function ensureTables(sql: Sql): Promise<void> {
  // Until Preview has its own Neon branch, previews must remain strictly read-only.
  if (process.env.VERCEL_ENV === "preview") return Promise.resolve();
  const globals = globalThis as StoreGlobals;
  if (!globals.__nightstripTablesReady) {
    globals.__nightstripTablesReady = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS nightstrip_state (
          id INTEGER PRIMARY KEY,
          data JSONB NOT NULL,
          version INTEGER NOT NULL DEFAULT 0
        )
      `;
      await sql`
        INSERT INTO nightstrip_state (id, data, version)
        VALUES (1, ${JSON.stringify(EMPTY)}::jsonb, 0)
        ON CONFLICT (id) DO NOTHING
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS nightstrip_listing_clicks (
          listing_id TEXT PRIMARY KEY,
          clicks BIGINT NOT NULL DEFAULT 0
        )
      `;
    })().catch((error) => {
      delete globals.__nightstripTablesReady;
      throw error;
    });
  }
  return globals.__nightstripTablesReady;
}

function hydrateState(raw: Partial<StoreState> | undefined): StoreState {
  return {
    listings: Array.isArray(raw?.listings) ? raw.listings : [],
    wallets: Array.isArray(raw?.wallets) ? raw.wallets : [],
    receipts: Array.isArray(raw?.receipts) ? raw.receipts : [],
    pendingClaims: Array.isArray(raw?.pendingClaims) ? raw.pendingClaims : [],
    processedIpnIds: Array.isArray(raw?.processedIpnIds) ? raw.processedIpnIds : [],
    orphanIpns: Array.isArray(raw?.orphanIpns) ? raw.orphanIpns : [],
    allTimePot: typeof raw?.allTimePot === "number" ? raw.allTimePot : 0,
  };
}

async function readDbState(
  sql: Sql,
  includeClickDeltas: boolean,
): Promise<{ state: StoreState; version: number }> {
  const rows = (await sql`
    SELECT data, version FROM nightstrip_state WHERE id = 1
  `) as Array<{ data: Partial<StoreState>; version: number }>;
  const state = hydrateState(rows[0]?.data);
  if (includeClickDeltas && process.env.VERCEL_ENV !== "preview") {
    const clickRows = (await sql`
      SELECT listing_id, clicks FROM nightstrip_listing_clicks
    `) as Array<{ listing_id: string; clicks: string | number }>;
    const deltas = new Map(clickRows.map((row) => [row.listing_id, Number(row.clicks)]));
    state.listings = state.listings.map((listing) => ({
      ...listing,
      clicks: (listing.clicks ?? 0) + (deltas.get(listing.id) ?? 0),
    }));
  }
  return { state, version: rows[0]?.version ?? 0 };
}

async function withDb<T>(
  sql: Sql,
  fn: (state: StoreState) => T | Promise<T>,
  persist: boolean,
): Promise<T> {
  await ensureTables(sql);
  if (!persist) {
    const { state } = await readDbState(sql, true);
    return fn(state);
  }

  // Neon HTTP queries can use different database sessions, so a session-level
  // advisory lock is not a safe concurrency primitive here. Persist with an
  // optimistic compare-and-swap on the version column instead.
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const { state, version } = await readDbState(sql, false);
    const result = await fn(state);
    const updated = (await sql`
      UPDATE nightstrip_state
      SET data = ${JSON.stringify(state)}::jsonb, version = version + 1
      WHERE id = 1 AND version = ${version}
      RETURNING version
    `) as Array<{ version: number }>;
    if (updated.length === 1) return result;
  }

  throw new Error("Store update conflicted too many times. Please retry.");
}

function withMemory<T>(
  fn: (state: StoreState) => T | Promise<T>,
  persist: boolean,
): Promise<T> {
  const slot = memorySlot();
  const run = slot.chain.then(async () => {
    try {
      const loaded = await readFileStore();
      slot.state = loaded;
    } catch {
      // keep memory
    }
    const result = await fn(slot.state);
    if (persist) {
      try {
        await writeFileStore(slot.state);
      } catch {
        // /tmp or cwd may be read-only; memory still holds the mutation
      }
    }
    return result;
  });
  slot.chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export async function withStore<T>(
  fn: (state: StoreState) => T | Promise<T>,
): Promise<T> {
  const sql = db();
  if (sql) return withDb(sql, fn, true);
  return withMemory(fn, true);
}

export async function readStore<T>(
  fn: (state: StoreState) => T | Promise<T>,
): Promise<T> {
  const sql = db();
  if (sql) return withDb(sql, fn, false);
  return withMemory(fn, false);
}

export async function incrementListingClicks(listingId: string): Promise<void> {
  const sql = db();
  if (!sql) {
    await withMemory((state) => {
      const listing = state.listings.find((item) => item.id === listingId);
      if (listing) listing.clicks += 1;
    }, true);
    return;
  }
  await ensureTables(sql);
  await sql`
    INSERT INTO nightstrip_listing_clicks (listing_id, clicks)
    VALUES (${listingId}, 1)
    ON CONFLICT (listing_id)
    DO UPDATE SET clicks = nightstrip_listing_clicks.clicks + 1
  `;
}

export function getWallet(state: StoreState, walletId: string): Wallet {
  let wallet = state.wallets.find((item) => item.id === walletId);
  if (!wallet) {
    wallet = {
      id: walletId,
      credits: 0,
      demoGranted: false,
      createdAt: Date.now(),
    };
    state.wallets.push(wallet);
  }
  return wallet;
}

export function emptyState(): StoreState {
  return structuredClone(EMPTY);
}
