import { describe, expect, it } from "vitest";
import { runScan } from "../../src/scan/run-scan.js";
import { normalizeJob } from "../../src/domain/normalize.js";
import type { LifecycleState } from "../../src/domain/lifecycle.js";
import type { Snapshot } from "../../src/domain/types.js";
import type { SnapshotStore } from "../../src/storage/blob-store.js";
import type { SourceAdapter } from "../../src/sources/types.js";

const now = "2026-09-24T12:00:00.000Z";
const rawJob = {
  sourceId: "ok", sourceJobId: "pipe-42", sourceKind: "employer" as const,
  url: "https://example.test/jobs/pipe-42", title: "Industrial Pipefitter",
  company: "Example AS", country: "Norway", description: "shipyard piping"
};
const previousSnapshot: Snapshot = {
  schemaVersion: "2.4", generatedAt: "2026-09-24T06:00:00.000Z",
  lastSuccessfulScanAt: "2026-09-24T06:00:00.000Z", status: "fresh",
  jobs: [normalizeJob(rawJob, "2026-09-24T06:00:00.000Z")],
  sources: [{ id: "ok", kind: "employer", status: "success", lastCheckedAt: "2026-09-24T06:00:00.000Z" }]
};

class MemoryStore implements SnapshotStore {
  latest: Snapshot | null = previousSnapshot;
  previous: Snapshot | null = null;
  lifecycle: LifecycleState = { jobs: Object.fromEntries(previousSnapshot.jobs.map(job => [job.id, job])), audit: {} };
  async getLatest() { return this.latest; }
  async getPrevious() { return this.previous; }
  async getLifecycle() { return this.lifecycle; }
  async publish(snapshot: Snapshot, lifecycle: LifecycleState) { this.previous = this.latest; this.latest = snapshot; this.lifecycle = lifecycle; }
  async acquireLock() { return { owner: "test", release: async () => undefined }; }
}

const adapter = (id: string, status: "success" | "failed", jobs = status === "success" ? [rawJob] : []): SourceAdapter => ({
  id, kind: id === "ok" ? "employer" : "portal",
  async scan() { return { sourceId: id, sourceKind: this.kind, status, jobs, startedAt: now, finishedAt: now, diagnosticCode: status === "failed" ? "fixture-failure" : undefined }; }
});

describe("scan pipeline", () => {
  it("publishes a valid partial snapshot when one source fails", async () => {
    const store = new MemoryStore();
    const outcome = await runScan({ adapters: [adapter("ok", "success"), adapter("down", "failed")], store, now: () => new Date(now), context: { fetcher: fetch } });
    expect(outcome.published).toBe(true);
    expect(outcome.snapshot.status).toBe("partial");
    expect(await store.getLatest()).toEqual(outcome.snapshot);
  });

  it("publishes a fallback status while retaining jobs when every source fails", async () => {
    const store = new MemoryStore();
    const outcome = await runScan({ adapters: [adapter("down", "failed")], store, now: () => new Date(now), context: { fetcher: fetch } });
    expect(outcome.published).toBe(true);
    expect((await store.getLatest())?.status).toBe("fallback");
    expect(outcome.snapshot.jobs).toEqual(previousSnapshot.jobs);
    expect(outcome.snapshot.lastSuccessfulScanAt).toBe(previousSnapshot.lastSuccessfulScanAt);
  });

  it("recovers a degraded first snapshot from the bundled baseline before merging live results", async () => {
    const store = new MemoryStore();
    const baselineJobs = Array.from({ length: 13 }, (_, index) => normalizeJob({
      ...rawJob,
      sourceId: `seed-${index}`,
      sourceJobId: `seed-${index}`,
      url: `https://example.test/jobs/seed-${index}`,
      title: `Industrial Pipefitter ${index}`
    }, "2026-09-15T00:00:00.000Z"));
    const recoverySnapshot: Snapshot = {
      schemaVersion: "2.4",
      generatedAt: "2026-09-15T00:00:00.000Z",
      lastSuccessfulScanAt: "2026-09-15T00:00:00.000Z",
      status: "fallback",
      jobs: baselineJobs,
      sources: baselineJobs.map(job => ({ id: job.sourceId, kind: job.sourceKind, status: "success", lastCheckedAt: "2026-09-15T00:00:00.000Z" }))
    };

    const outcome = await runScan({
      adapters: [adapter("ok", "success")],
      store,
      now: () => new Date(now),
      context: { fetcher: fetch },
      recoverySnapshot
    });

    expect(outcome.snapshot.jobs.length).toBeGreaterThanOrEqual(13);
    expect(outcome.snapshot.jobs.some(job => job.sourceJobId === "seed-12")).toBe(true);
  });
});
