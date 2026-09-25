import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { SourceAdapter } from "../../src/sources/types.js";
import { runFileScan } from "../../src/scan/file-scan.js";

const directories: string[] = [];
afterEach(async () => Promise.all(directories.splice(0).map(directory => rm(directory, { recursive: true, force: true }))));

describe("GitHub Actions file scan", () => {
  it("writes a validated public snapshot for static hosting", async () => {
    const directory = await mkdtemp(join(tmpdir(), "pipe-radar-scan-"));
    directories.push(directory);
    const adapter: SourceAdapter = {
      id: "test", kind: "employer",
      async scan({ now }) {
        const timestamp = now().toISOString();
        return {
          sourceId: "test", sourceKind: "employer", status: "success", startedAt: timestamp, finishedAt: timestamp,
          jobs: [{ sourceId: "test", sourceJobId: "1", sourceKind: "employer", url: "https://example.test/job/1", title: "Pipefitter", company: "Yard AS", country: "Norway" }]
        };
      }
    };

    const outcome = await runFileScan({
      adapters: [adapter],
      paths: { statePath: join(directory, "scan-state.json"), publicPath: join(directory, "jobs.json") },
      now: () => new Date("2026-09-25T12:00:00.000Z"),
      context: { fetcher: fetch, env: {} }
    });

    const published = JSON.parse(await readFile(join(directory, "jobs.json"), "utf8"));
    expect(outcome.published).toBe(true);
    expect(published.jobs).toHaveLength(1);
    expect(published.jobs[0].company).toBe("Yard AS");
  });
});
