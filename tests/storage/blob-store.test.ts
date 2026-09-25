import { describe, expect, it } from "vitest";
import { normalizeJob } from "../../src/domain/normalize.js";
import { createBlobSnapshotStore, type BlobLike } from "../../src/storage/blob-store.js";
import type { Snapshot } from "../../src/domain/types.js";

class MemoryBlob implements BlobLike {
  values = new Map<string, unknown>();
  async get(key: string) { return this.values.get(key) ?? null; }
  async getWithMetadata(key: string) { const data = this.values.get(key); return data === undefined ? null : { data, metadata: {} }; }
  async set(_key: string, _data: string) { return { modified: true }; }
  async setJSON(key: string, data: unknown, options?: { onlyIfNew?: boolean }) {
    if (options?.onlyIfNew && this.values.has(key)) return { modified: false };
    this.values.set(key, structuredClone(data));
    return { modified: true };
  }
  async delete(key: string) { this.values.delete(key); }
}

const at = (hour: number) => `2026-09-24T${String(hour).padStart(2, "0")}:00:00.000Z`;
const snapshot = (hour: number): Snapshot => ({
  schemaVersion: "2.4", generatedAt: at(hour), lastSuccessfulScanAt: at(hour), status: "fresh",
  jobs: [normalizeJob({ sourceId: "test", sourceJobId: `job-${hour}`, sourceKind: "employer", url: `https://example.test/${hour}`, title: "Pipefitter", company: "A", country: "Norway" }, at(hour))],
  sources: [{ id: "test", kind: "employer", status: "success", lastCheckedAt: at(hour) }]
});

describe("atomic snapshot storage", () => {
  it("leaves latest unchanged when candidate validation fails", async () => {
    const blob = new MemoryBlob();
    const store = createBlobSnapshotStore(blob);
    await store.publish(snapshot(6), { jobs: {}, audit: {} });
    await expect(store.publish({ ...snapshot(12), schemaVersion: "2.3" } as unknown as Snapshot, { jobs: {}, audit: {} })).rejects.toThrow(/schema/i);
    expect(await store.getLatest()).toEqual(snapshot(6));
  });

  it("moves latest to previous before publishing a valid candidate", async () => {
    const store = createBlobSnapshotStore(new MemoryBlob());
    await store.publish(snapshot(6), { jobs: {}, audit: {} });
    await store.publish(snapshot(12), { jobs: {}, audit: {} });
    expect(await store.getLatest()).toEqual(snapshot(12));
    expect(await store.getPrevious()).toEqual(snapshot(6));
  });

  it("expires a stale lock and an old owner cannot release its replacement", async () => {
    const blob = new MemoryBlob();
    const store = createBlobSnapshotStore(blob);
    const first = await store.acquireLock(new Date(at(6)), 1000);
    expect(await store.acquireLock(new Date(at(6)), 1000)).toBeNull();
    const replacement = await store.acquireLock(new Date(at(7)), 1000);
    expect(replacement).not.toBeNull();
    await first?.release();
    expect(blob.values.has("locks/scan")).toBe(true);
    await replacement?.release();
    expect(blob.values.has("locks/scan")).toBe(false);
  });

  it("returns no lock when a conditional create loses the race", async () => {
    const blob = new MemoryBlob();
    const original = blob.setJSON.bind(blob);
    let first = true;
    blob.setJSON = async (key, data, options) => {
      if (key === "locks/scan" && options?.onlyIfNew && first) { first = false; return { modified: false }; }
      return original(key, data, options);
    };
    expect(await createBlobSnapshotStore(blob).acquireLock(new Date(at(6)))).toBeNull();
  });

  it("publishes snapshot and lifecycle through one authoritative state write", async () => {
    const blob = new MemoryBlob();
    const store = createBlobSnapshotStore(blob);
    const lifecycle = { jobs: { test: snapshot(6).jobs[0]! }, audit: {} };
    await store.publish(snapshot(6), lifecycle);
    expect(await store.getLatest()).toEqual(snapshot(6));
    expect(await store.getLifecycle()).toEqual(lifecycle);
    expect(blob.values.has("state/current")).toBe(true);
  });
});
