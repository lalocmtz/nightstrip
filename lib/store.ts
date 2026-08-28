import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { neon } from "@neondatabase/serverless";
import type { StoreState, Wallet } from "./types";

const EMPTY: StoreState = {
  listings: [],
  wallets: [],
  receipts: [],
  pendingClaims: [],
  processedIpnIds: [],
  activity: [],
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
    return { ...EMPTY, ...(JSON.parse(raw) as StoreState) };
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

async function ensureTable(sql: Sql): Promise<void> {
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
}

async function withDb<T>(
  sql: Sql,
  fn: (state: StoreState) => T | Promise<T>,
  persist: boolean,
): Promise<T> {
  await ensureTable(sql);
  if (!persist) {
    const rows = (await sql`SELECT data FROM nightstrip_state WHERE id = 1`) as Array<{
      data: StoreState;
    }>;
    const state: StoreState = { ...EMPTY, ...(rows[0]?.data ?? EMPTY) };
    return fn(state);
  }

  // Neon HTTP queries can use different database sessions, so a session-level
  // advisory lock is not a safe concurrency primitive here. Persist with an
  // optimistic compare-and-swap on the version column instead.
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const rows = (await sql`
      SELECT data, version FROM nightstrip_state WHERE id = 1
    `) as Array<{
      data: StoreState;
      version: number;
    }>;
    const state: StoreState = { ...EMPTY, ...(rows[0]?.data ?? EMPTY) };
    const result = await fn(state);
    const version = rows[0]?.version ?? 0;
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
