/**
 * Offline-first persistence for the active workout (brief §4 rules 12–14).
 *
 * Two concerns, one SQLite db:
 * 1. `active_workout` — a single-row durable snapshot of the in-progress
 *    workout as JSON, written on every mutation so a crash/kill/airplane-mode
 *    session is never lost and can be fully recovered on reopen.
 * 2. `sync_queue` — an append log of API operations (each with a client UUID op
 *    id) to replay when back online. Re-queuing the same op id is idempotent,
 *    and the server upserts by client UUID, so reconnect never duplicates.
 *
 * All writes use client-generated UUIDs; the server reconciles by id.
 */
import * as SQLite from 'expo-sqlite';

export type SyncOp = {
  /** Client-generated op id (dedup key). */
  id: string;
  /** HTTP method + path relative to the API base. */
  method: 'POST' | 'PATCH' | 'DELETE';
  path: string;
  /** JSON body (undefined for DELETE). */
  body?: unknown;
  createdAt: number;
};

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  dbPromise ??= (async () => {
    const db = await SQLite.openDatabaseAsync('liftmate.db');
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS active_workout (
        id TEXT PRIMARY KEY NOT NULL,
        data TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS sync_queue (
        id TEXT PRIMARY KEY NOT NULL,
        method TEXT NOT NULL,
        path TEXT NOT NULL,
        body TEXT,
        created_at INTEGER NOT NULL
      );
    `);
    return db;
  })();
  return dbPromise;
}

/* ----------------------- active workout snapshot ----------------------- */

/** Persist (upsert) the active workout snapshot. */
export async function saveActiveWorkout(id: string, data: unknown): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO active_workout (id, data, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`,
    id,
    JSON.stringify(data),
    Date.now(),
  );
}

/** Load the most recently updated active workout snapshot, if any. */
export async function loadActiveWorkout<T>(): Promise<T | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ data: string }>(
    `SELECT data FROM active_workout ORDER BY updated_at DESC LIMIT 1`,
  );
  if (!row) {
    return null;
  }
  try {
    return JSON.parse(row.data) as T;
  } catch {
    return null;
  }
}

/** Clear the active workout snapshot (e.g. after finishing & syncing). */
export async function clearActiveWorkout(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM active_workout WHERE id = ?`, id);
}

/* ----------------------------- sync queue ----------------------------- */

/** Enqueue (idempotently) an op to replay against the API. */
export async function enqueueOp(op: SyncOp): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO sync_queue (id, method, path, body, created_at) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET method = excluded.method, path = excluded.path,
       body = excluded.body, created_at = excluded.created_at`,
    op.id,
    op.method,
    op.path,
    op.body === undefined ? null : JSON.stringify(op.body),
    op.createdAt,
  );
}

/** All queued ops, oldest first. */
export async function pendingOps(): Promise<SyncOp[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    id: string;
    method: string;
    path: string;
    body: string | null;
    created_at: number;
  }>(`SELECT id, method, path, body, created_at FROM sync_queue ORDER BY created_at ASC`);
  return rows.map((r) => ({
    id: r.id,
    method: r.method as SyncOp['method'],
    path: r.path,
    body: r.body ? (JSON.parse(r.body) as unknown) : undefined,
    createdAt: r.created_at,
  }));
}

/** Remove a successfully-synced op. */
export async function dequeueOp(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM sync_queue WHERE id = ?`, id);
}

export async function pendingCount(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ n: number }>(`SELECT COUNT(*) AS n FROM sync_queue`);
  return row?.n ?? 0;
}
