import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

/**
 * Lazy, optional database access.
 *
 * - Never throws at import time (safe for Vercel's build-time page-data
 *   collection, which evaluates route modules without env secrets).
 * - Accepts DATABASE_URL or Vercel Postgres' POSTGRES_URL.
 * - Enables SSL automatically for non-local hosts (Neon/Vercel require it).
 */

function resolveUrl(): string | null {
  const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? null;
  return url && url.trim().length > 0 ? url : null;
}

function isLocalHost(url: string): boolean {
  try {
    const u = new URL(url);
    return ["localhost", "127.0.0.1", "::1"].includes(u.hostname);
  } catch {
    return false;
  }
}

declare global {
  var __bridgePgPool: Pool | undefined;
  var __bridgePgDb: NodePgDatabase | undefined;
}

export function hasDatabase(): boolean {
  return resolveUrl() !== null;
}

export function getPool(): Pool | null {
  if (globalThis.__bridgePgPool) return globalThis.__bridgePgPool;
  const url = resolveUrl();
  if (!url) return null;
  const local = isLocalHost(url);
  const sslParam = /[?&]sslmode=(require|verify-ca|verify-full)/.test(url);
  const pool = new Pool({
    connectionString: url,
    max: 4,
    ssl: !local || sslParam ? { rejectUnauthorized: false } : undefined,
  });
  globalThis.__bridgePgPool = pool;
  return pool;
}

export function getDb(): NodePgDatabase | null {
  if (globalThis.__bridgePgDb) return globalThis.__bridgePgDb;
  const pool = getPool();
  if (!pool) return null;
  const db = drizzle(pool);
  globalThis.__bridgePgDb = db;
  return db;
}
