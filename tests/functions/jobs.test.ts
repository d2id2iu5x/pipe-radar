import { describe, expect, it } from "vitest";
import { normalizeJob } from "../../src/domain/normalize.js";
import type { Snapshot } from "../../src/domain/types.js";
import { jobsHandler } from "../../netlify/functions/jobs.js";

const now = "2026-09-24T12:00:00.000Z";
const snapshot: Snapshot = {
  schemaVersion: "2.4", generatedAt: now, lastSuccessfulScanAt: now, status: "fresh",
  jobs: [normalizeJob({ sourceId: "test", sourceJobId: "job-1", sourceKind: "employer", url: "https://example.test/job-1", title: "Pipefitter", company: "A", country: "Norway" }, now)],
  sources: [{ id: "test", kind: "employer", status: "success", lastCheckedAt: now }],
  internal: { parserMessage: "do not expose", token: "secret" }
};
const context = {} as never;

describe("GET /api/jobs", () => {
  it("rejects non-GET public API methods", async () => {
    const response = await jobsHandler(new Request("https://site.test/api/jobs", { method: "POST" }), context, { store: { getLatest: async () => snapshot } });
    expect(response.status).toBe(405);
  });

  it("never returns internal diagnostics and applies safe cache headers", async () => {
    const response = await jobsHandler(new Request("https://site.test/api/jobs"), context, { store: { getLatest: async () => snapshot } });
    const body = await response.text();
    expect(body).not.toContain("parserMessage");
    expect(body).not.toContain("secret");
    expect(response.headers.get("cache-control")).toBe("public, max-age=60, stale-while-revalidate=300");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  });

  it("returns a validated seed fallback when Blob storage is empty", async () => {
    const fallback = { ...snapshot, status: "fallback" as const, internal: undefined };
    const response = await jobsHandler(new Request("https://site.test/api/jobs"), context, { store: { getLatest: async () => null }, seedLoader: async () => fallback });
    expect(response.status).toBe(200);
    expect((await response.json()).status).toBe("fallback");
  });

  it("serves the recovery baseline when the stored snapshot has degraded to one job", async () => {
    const fallbackJobs = Array.from({ length: 13 }, (_, index) => normalizeJob({
      sourceId: `seed-${index}`,
      sourceJobId: `seed-${index}`,
      sourceKind: "portal",
      url: `https://example.test/seed-${index}`,
      title: `Industrial Pipefitter ${index}`,
      company: "Seed AS",
      country: "Norway"
    }, "2026-09-15T00:00:00.000Z"));
    const fallback: Snapshot = {
      schemaVersion: "2.4",
      generatedAt: "2026-09-15T00:00:00.000Z",
      lastSuccessfulScanAt: "2026-09-15T00:00:00.000Z",
      status: "fallback",
      jobs: fallbackJobs,
      sources: fallbackJobs.map(job => ({ id: job.sourceId, kind: job.sourceKind, status: "success", lastCheckedAt: "2026-09-15T00:00:00.000Z" }))
    };

    const response = await jobsHandler(new Request("https://site.test/api/jobs"), context, {
      store: { getLatest: async () => snapshot },
      seedLoader: async () => fallback
    });
    const body = await response.json() as Snapshot;

    expect(body.status).toBe("partial");
    expect(body.jobs.length).toBe(14);
    expect(body.jobs.some(job => job.sourceJobId === "seed-12")).toBe(true);
    expect(body.jobs.some(job => job.sourceJobId === "job-1")).toBe(true);
  });
});
