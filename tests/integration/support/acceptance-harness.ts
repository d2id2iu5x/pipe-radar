import { readFileSync } from "node:fs";
import { jobsHandler } from "../../../netlify/functions/jobs.js";
import type { LifecycleState } from "../../../src/domain/lifecycle.js";
import type { RawJob, Snapshot, SourceRunStatus } from "../../../src/domain/types.js";
import { runScan } from "../../../src/scan/run-scan.js";
import { loadJobs } from "../../../src/client/remote-data.js";
import type { SnapshotStore } from "../../../src/storage/blob-store.js";
import type { SourceAdapter } from "../../../src/sources/types.js";

const fixtures = JSON.parse(readFileSync("tests/fixtures/integration/source-set.json", "utf8")) as Record<string, RawJob>;

class MemoryStore implements SnapshotStore {
  latest: Snapshot | null = null;
  previous: Snapshot | null = null;
  lifecycle: LifecycleState = { jobs: {}, audit: {} };
  async getLatest() { return this.latest; }
  async getPrevious() { return this.previous; }
  async getLifecycle() { return this.lifecycle; }
  async publish(snapshot: Snapshot, lifecycle: LifecycleState) { this.previous = this.latest; this.latest = snapshot; this.lifecycle = lifecycle; }
  async acquireLock() { return { owner: "acceptance", release: async () => undefined }; }
}

function adapter(name: string, stamp: string): SourceAdapter {
  const status: SourceRunStatus = name === "down" ? "failed" : "success";
  const id = name === "nav-inactive" ? "nav" : name;
  const kind = id === "employer" ? "employer" : id === "nav" ? "official-api" : "portal";
  const jobs = name === "employer" ? [fixtures.employer!] : name === "portal" ? [fixtures.portalCopy!] : name === "nav" ? [fixtures.nav!] : [];
  return {
    id,
    kind,
    async scan() {
      return {
        sourceId: id, sourceKind: kind, status, jobs, startedAt: stamp, finishedAt: stamp,
        ...(name === "nav-inactive" ? { inactiveIds: ["nav:uuid-expired"] } : {}),
        ...(name === "down" ? { diagnosticCode: "fixture-down" } : {})
      };
    }
  };
}

export function createAcceptanceHarness() {
  const store = new MemoryStore();
  let scanNumber = 0;
  return {
    store,
    async scan(names: string[]) {
      scanNumber += 1;
      const hour = String(12 + scanNumber).padStart(2, "0");
      const stamp = `2026-09-24T${hour}:00:00.000Z`;
      return runScan({ adapters: names.map(name => adapter(name, stamp)), store, now: () => new Date(stamp), context: { fetcher: fetch } });
    },
    async loadClient(options: { unavailable?: boolean } = {}) {
      const fallback = [{ id: "embedded-fallback" }];
      const fetcher = options.unavailable
        ? async () => { throw new Error("offline"); }
        : async () => jobsHandler(new Request("https://site.test/api/jobs"), {} as never, { store });
      return loadJobs({ fetcher, fallback, timeoutMs: 100 });
    }
  };
}
