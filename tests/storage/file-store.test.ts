import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { normalizeJob } from "../../src/domain/normalize.js";
import type { Snapshot } from "../../src/domain/types.js";
import { createFileSnapshotStore } from "../../src/storage/file-store.js";

const directories: string[] = [];
const at = (hour: number) => `2026-09-25T${String(hour).padStart(2, "0")}:00:00.000Z`;
const snapshot = (hour: number): Snapshot => ({
  schemaVersion: "2.4", generatedAt: at(hour), lastSuccessfulScanAt: at(hour), status: "fresh",
  jobs: [normalizeJob({ sourceId: "test", sourceJobId: `job-${hour}`, sourceKind: "employer", url: `https://example.test/${hour}`, title: "Pipefitter", company: "A", country: "Norway" }, at(hour))],
  sources: [{ id: "test", kind: "employer", status: "success", lastCheckedAt: at(hour) }]
});

async function paths() {
  const directory = await mkdtemp(join(tmpdir(), "pipe-radar-file-store-"));
  directories.push(directory);
  return { statePath: join(directory, "scan-state.json"), publicPath: join(directory, "jobs.json") };
}

afterEach(async () => Promise.all(directories.splice(0).map(directory => rm(directory, { recursive: true, force: true }))));

describe("portable file snapshot storage", () => {
  it("publishes private scan state and a public snapshot atomically", async () => {
    const files = await paths();
    const store = createFileSnapshotStore(files);
    const lifecycle = { jobs: { test: snapshot(6).jobs[0]! }, audit: {} };

    await store.publish(snapshot(6), lifecycle, { outcome: "success" });

    expect(await store.getLatest()).toEqual(snapshot(6));
    expect(await store.getLifecycle()).toEqual(lifecycle);
    const publicSnapshot = JSON.parse(await readFile(files.publicPath, "utf8"));
    expect(publicSnapshot).toEqual(snapshot(6));
    expect(publicSnapshot.internal).toBeUndefined();
  });

  it("preserves the previous snapshot across publications", async () => {
    const files = await paths();
    const store = createFileSnapshotStore(files);
    await store.publish(snapshot(6), { jobs: {}, audit: {} });
    await store.publish(snapshot(12), { jobs: {}, audit: {} });
    expect(await store.getLatest()).toEqual(snapshot(12));
    expect(await store.getPrevious()).toEqual(snapshot(6));
  });

  it("rejects an invalid candidate without replacing public data", async () => {
    const files = await paths();
    const store = createFileSnapshotStore(files);
    await store.publish(snapshot(6), { jobs: {}, audit: {} });
    await expect(store.publish({ ...snapshot(12), schemaVersion: "2.3" } as unknown as Snapshot, { jobs: {}, audit: {} })).rejects.toThrow(/schema/i);
    expect(await store.getLatest()).toEqual(snapshot(6));
  });
});
