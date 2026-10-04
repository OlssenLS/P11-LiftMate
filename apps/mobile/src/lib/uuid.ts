/**
 * Client-generated UUIDs for offline-writable rows (brief §4 rule 14).
 *
 * Uses `expo-crypto`'s `randomUUID` (RFC 4122 v4). Generating ids on the client
 * lets us persist a set locally and sync it later with no id collisions.
 */
import * as Crypto from 'expo-crypto';

export function newId(): string {
  return Crypto.randomUUID();
}
