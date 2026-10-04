/**
 * Sync processor — drains the offline op queue against the API.
 *
 * Ops carry client-generated ids and the server upserts by those ids, so
 * replaying is idempotent and reconnect never duplicates (brief §4 rule 14).
 * A single-flight guard prevents overlapping drains. Any op that fails (e.g.
 * still offline) stays queued and is retried on the next drain.
 */
import { api } from '@/lib/api-client';
import { dequeueOp, pendingOps, type SyncOp } from '@/lib/db';

let draining: Promise<number> | null = null;

async function runOp(op: SyncOp): Promise<void> {
  if (op.method === 'DELETE') {
    await api.delete(op.path);
    return;
  }
  if (op.method === 'PATCH') {
    await api.patch(op.path, op.body);
    return;
  }
  await api.post(op.path, op.body);
}

/**
 * Drain all pending ops. Returns the number successfully synced. Stops early on
 * the first failure so order is preserved and the failing op is retried later.
 */
export async function drainSyncQueue(): Promise<number> {
  draining ??= (async () => {
    const ops = await pendingOps();
    let synced = 0;
    for (const op of ops) {
      try {
        await runOp(op);
        await dequeueOp(op.id);
        synced += 1;
      } catch {
        // Still offline or server error — keep this and remaining ops queued.
        break;
      }
    }
    return synced;
  })().finally(() => {
    draining = null;
  });
  return draining;
}
