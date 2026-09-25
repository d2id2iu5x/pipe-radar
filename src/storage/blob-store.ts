import { randomUUID } from "node:crypto";
import { getStore } from "@netlify/blobs";
import type { LifecycleState } from "../domain/lifecycle.js";
import type { Snapshot } from "../domain/types.js";
import { validateSnapshot } from "../domain/validate.js";

export interface BlobLike {
  get(key: string, options?: { type?: "json"; consistency?: "strong" }): Promise<unknown>;
  getWithMetadata(key: string, options?: { type?: "json"; consistency?: "strong" }): Promise<{ data: unknown; metadata: Record<string, unknown> } | null>;
  set(key: string, data: string, options?: Record<string, unknown>): Promise<unknown>;
  setJSON(key: string, data: unknown, options?: { onlyIfNew?: boolean }): Promise<{ modified?: boolean } | unknown>;
  delete(key: string): Promise<void>;
}

export interface ScanLock { owner: string; release(): Promise<void> }

export interface SnapshotStore {
  getLatest(): Promise<Snapshot | null>;
  getPrevious(): Promise<Snapshot | null>;
  getLifecycle(): Promise<LifecycleState>;
  publish(snapshot: Snapshot, lifecycle: LifecycleState, report?: unknown): Promise<void>;
  acquireLock(now: Date, ttlMs?: number): Promise<ScanLock | null>;
}

const json = async <T>(store: BlobLike, key: string): Promise<T | null> => (await store.get(key, { type: "json", consistency: "strong" }) as T | null);

interface PersistedState { snapshot: Snapshot; lifecycle: LifecycleState; report: unknown }

export function createBlobSnapshotStore(blob?: BlobLike): SnapshotStore {
  const store = blob ?? getStore({ name: "pipe-radar", consistency: "strong" }) as unknown as BlobLike;
  return {
    async getLatest() {
      const state = await json<PersistedState>(store, "state/current");
      const value = state?.snapshot ?? await json<Snapshot>(store, "snapshots/latest");
      return value ? validateSnapshot(value) : null;
    },
    async getPrevious() { const value = await json<Snapshot>(store, "snapshots/previous"); return value ? validateSnapshot(value) : null; },
    async getLifecycle() {
      const state = await json<PersistedState>(store, "state/current");
      return state?.lifecycle ?? await json<LifecycleState>(store, "state/lifecycle") ?? { jobs: {}, audit: {} };
    },
    async publish(snapshot, lifecycle, report = {}) {
      const candidate = validateSnapshot(snapshot);
      const oldState = await json<PersistedState>(store, "state/current");
      const oldLatest = oldState?.snapshot ?? await json<Snapshot>(store, "snapshots/latest");
      if (oldLatest) await store.setJSON("snapshots/previous", oldLatest);
      await store.setJSON("state/current", { snapshot: candidate, lifecycle, report });
    },
    async acquireLock(now, ttlMs = 15 * 60 * 1000) {
      const key = "locks/scan";
      const existing = await store.getWithMetadata(key, { type: "json", consistency: "strong" });
      if (existing) {
        const lock = existing.data as { expiresAt?: string };
        if (!lock.expiresAt || Date.parse(lock.expiresAt) > now.getTime()) return null;
        await store.delete(key);
      }
      const owner = randomUUID();
      const value = { owner, expiresAt: new Date(now.getTime() + ttlMs).toISOString() };
      try {
        const result = await store.setJSON(key, value, { onlyIfNew: true }) as { modified?: boolean } | undefined;
        if (result?.modified === false) return null;
      } catch { return null; }
      return {
        owner,
        async release() {
          const current = await store.getWithMetadata(key, { type: "json", consistency: "strong" });
          if ((current?.data as { owner?: string } | undefined)?.owner === owner) await store.delete(key);
        }
      };
    }
  };
}
