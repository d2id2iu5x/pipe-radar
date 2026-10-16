import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadJobs } from "../../src/client/remote-data.js";
import { renderDataStatus } from "../../src/client/status-view.js";

const seedJobs = [{ id: "seed-1", title: "Fallback" }];
const remoteJob = { id: "remote-1", title: "Pipefitter", url: "https://example.test/job/1", sources: [{ url: "https://example.test/job/1" }] };
const payload = { schemaVersion: "2.4", status: "fresh", generatedAt: "2026-09-24T12:00:00.000Z", lastSuccessfulScanAt: "2026-09-24T12:00:00.000Z", jobs: [remoteJob], sources: [] };

describe("remote job loading", () => {
  beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-10-16T12:00:00.000Z")); });
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

  it.each(["fresh", "partial", "fallback"])("does not make an old %s snapshot current after a successful download", async status => {
    const input = { ...payload, status, generatedAt: new Date().toISOString(), sources: [{ id: "nav", status: status === "fallback" ? "failed" : "success" }] };
    const before = JSON.stringify(input);
    const result = await loadJobs({ fetcher: async () => new Response(before), fallback: seedJobs });
    const target = document.createElement("div");
    renderDataStatus(result, target);
    expect(target.querySelector("[data-status-label]")?.textContent).toBe("DANE WYMAGAJĄ PONOWNEJ WERYFIKACJI");
    expect(result.lastSuccessfulScanAt).toBe(payload.lastSuccessfulScanAt);
    expect(result.generatedAt).toBe(input.generatedAt);
    expect(result.jobs).toEqual([remoteJob]);
    expect(result.sources).toEqual(input.sources);
    expect(JSON.stringify(input)).toBe(before);
  });

  it.each([null, "bad date", "2026-10-17T12:00:00Z"])("retains usable remote jobs with an untrusted scan date %s", async date => {
    const result = await loadJobs({ fetcher: async () => new Response(JSON.stringify({ ...payload, lastSuccessfulScanAt: date })), fallback: seedJobs });
    const target = document.createElement("div");
    renderDataStatus(result, target);
    expect(result.jobs).toEqual([remoteJob]);
    expect(target.querySelector("[data-status-label]")?.textContent).toBe("DANE WYMAGAJĄ PONOWNEJ WERYFIKACJI");
  });

  it("retains the supplied local fallback and saved user data on a network failure", async () => {
    localStorage.setItem("pipe-radar-saved-v2", '{"saved":{"note":"keep"}}');
    const result = await loadJobs({ fetcher: async () => { throw new Error("offline fixture"); }, fallback: seedJobs });
    const target = document.createElement("div");
    renderDataStatus(result, target);
    expect(result.mode).toBe("local");
    expect(result.jobs).toBe(seedJobs);
    expect(target.textContent).toContain("TRYB LOKALNY");
    expect(target.textContent).not.toContain("DANE AKTUALNE");
    expect(localStorage.getItem("pipe-radar-saved-v2")).toBe('{"saved":{"note":"keep"}}');
  });
  it("loads the portable static snapshot used by Cloudflare Pages", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify(payload)));
    await loadJobs({ fetcher, fallback: seedJobs, timeoutMs: 100 });
    expect(fetcher).toHaveBeenCalledWith(
      "https://raw.githubusercontent.com/d2id2iu5x/pipe-radar/main/data/jobs.json",
      expect.objectContaining({ cache: "no-cache" })
    );
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
