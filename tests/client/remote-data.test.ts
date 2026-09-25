import { describe, expect, it, vi } from "vitest";
import { loadJobs } from "../../src/client/remote-data.js";

const seedJobs = [{ id: "seed-1", title: "Fallback" }];
const remoteJob = { id: "remote-1", title: "Pipefitter", url: "https://example.test/job/1", sources: [{ url: "https://example.test/job/1" }] };
const payload = { schemaVersion: "2.4", status: "fresh", generatedAt: "2026-09-24T12:00:00.000Z", lastSuccessfulScanAt: "2026-09-24T12:00:00.000Z", jobs: [remoteJob], sources: [] };

describe("remote job loading", () => {
  it("loads the portable static snapshot used by Cloudflare Pages", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify(payload)));
    await loadJobs({ fetcher, fallback: seedJobs, timeoutMs: 100 });
    expect(fetcher).toHaveBeenCalledWith("/data/jobs.json", expect.objectContaining({ cache: "no-cache" }));
  });

  it("uses validated remote jobs without writing localStorage", async () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    const result = await loadJobs({ fetcher: async () => new Response(JSON.stringify(payload)), fallback: seedJobs, timeoutMs: 100 });
    expect(result.mode).toBe("fresh");
    expect(result.jobs).toEqual([remoteJob]);
    expect(setItem).not.toHaveBeenCalled();
  });

  it("uses the embedded fallback after API timeout", async () => {
    const neverResolvingFetcher = () => new Promise<Response>(() => undefined);
    const result = await loadJobs({ fetcher: neverResolvingFetcher, fallback: seedJobs, timeoutMs: 5 });
    expect(result.mode).toBe("local");
    expect(result.jobs).toEqual(seedJobs);
  });

  it("rejects duplicate ids and unsafe source URLs", async () => {
    const invalid = { ...payload, jobs: [remoteJob, { ...remoteJob, url: "javascript:alert(1)" }] };
    const result = await loadJobs({ fetcher: async () => new Response(JSON.stringify(invalid)), fallback: seedJobs, timeoutMs: 100 });
    expect(result.mode).toBe("local");
    expect(result.jobs).toEqual(seedJobs);
  });
});
