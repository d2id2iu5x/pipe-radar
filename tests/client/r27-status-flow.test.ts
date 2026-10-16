import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDataStatusView, renderDataStatus } from "../../src/client/status-view.js";
import { loadJobs } from "../../src/client/remote-data.js";

const NOW = "2026-10-16T12:00:00.000Z";
const WARNING = "DANE WYMAGAJĄ PONOWNEJ WERYFIKACJI";
const meta = { mode: "fresh", lastSuccessfulScanAt: NOW, sources: [{ id: "test", status: "success" }] };
const views: ReturnType<typeof createDataStatusView>[] = [];
function view(target: HTMLElement) {
  const status = createDataStatusView(target);
  views.push(status);
  return status;
}
function boot() {
  const html = readFileSync("index.html", "utf8");
  document.documentElement.innerHTML = html;
  window.eval([...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match => match[1]).join("\n"));
  return { html, w: window as any, target: document.getElementById("dataStatus")! };
}

describe("R27 live status and app integration (offline fixtures)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(NOW));
    localStorage.clear();
    document.body.replaceChildren();
  });
  afterEach(() => {
    views.splice(0).forEach(status => status.dispose());
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("expires an open page exactly after 24 hours without fetching again", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const target = document.createElement("div");
    const status = view(target);
    status.update(meta);
    const badge = target.querySelector("strong");
    const details = target.querySelector("details")!;
    details.open = true;
    vi.advanceTimersByTime(24 * 60 * 60 * 1000);
    expect(target.querySelector("strong")).toBe(badge);
    expect(target.textContent).toContain("DANE AKTUALNE");
    vi.advanceTimersByTime(1);
    expect(target.textContent).toContain(WARNING);
    expect(target.textContent).not.toContain("DANE AKTUALNE");
    expect(target.querySelector("details")?.open).toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it.each(["focus", "pageshow", "visibilitychange"])("rechecks after a sleeping tab resumes via %s", event => {
    const target = document.createElement("div");
    view(target).update(meta);
    vi.setSystemTime(new Date("2026-10-18T12:00:00Z"));
    (event === "visibilitychange" ? document : window).dispatchEvent(new Event(event));
    expect(target.textContent).toContain(WARNING);
  });

  it("refreshes from an old snapshot to a recent one and removes its timer/listeners on disposal", () => {
    const target = document.createElement("div");
    const status = view(target);
    status.update({ ...meta, lastSuccessfulScanAt: "2026-10-10T12:00:00Z" });
    expect(target.textContent).toContain(WARNING);
    status.update(meta);
    expect(target.textContent).toContain("DANE AKTUALNE");
    expect(vi.getTimerCount()).toBe(1);
    status.dispose();
    expect(vi.getTimerCount()).toBe(0);
    vi.setSystemTime(new Date("2026-10-18T12:00:00Z"));
    window.dispatchEvent(new Event("focus"));
    expect(vi.getTimerCount()).toBe(0);
    expect(target.textContent).toContain("DANE AKTUALNE");
  });

  it("updates the warning reason after a clock correction without changing jobs", () => {
    const target = document.createElement("div");
    const status = view(target);
    status.update({ ...meta, lastSuccessfulScanAt: "2026-10-16T13:00:00Z" });
    expect(target.textContent).toContain("z przyszłości");
    vi.setSystemTime(new Date("2026-10-16T13:00:00Z"));
    window.dispatchEvent(new Event("focus"));
    expect(target.textContent).toContain("DANE AKTUALNE");
    vi.setSystemTime(new Date("2026-10-18T13:00:00Z"));
    window.dispatchEvent(new Event("focus"));
    expect(target.textContent).toContain("starszy niż 24 godziny");
  });

  it("updates an English page at expiry, without reverting its warning to Polish", async () => {
    const { w, target } = boot();
    const status = view(target);
    status.update(meta);
    window.eval(readFileSync("assets/i18n.js", "utf8"));
    document.dispatchEvent(new Event("DOMContentLoaded"));
    w.PIPE_RADAR_LANGUAGE.set("en");
    expect(target.textContent).toContain("DATA CURRENT");
    await vi.advanceTimersByTimeAsync(24 * 60 * 60 * 1000 + 1);
    expect(target.textContent).toContain("DATA REQUIRES REVERIFICATION");
    expect(target.textContent).toContain("The last successful scan is more than 24 hours old.");
    expect(target.textContent).not.toContain("DANE AKTUALNE");
    w.PIPE_RADAR_LANGUAGE.set("pl");
  });

  it("keeps one status timer through repeated successful or failed refreshes", () => {
    const target = document.createElement("div");
    const status = view(target);
    for (let attempt = 0; attempt < 10; attempt++) status.update({ ...meta, mode: attempt % 2 ? "fallback" : "fresh" });
    expect(vi.getTimerCount()).toBe(1);
    expect(target.textContent).toContain("KOPIA AWARYJNA");
  });

  it("retains offers, filters, saved notes and rotation comparison when the same database becomes stale", async () => {
    Object.defineProperty(navigator, "locks", { configurable: true, value: { request: async (_name: any, _options: any, callback: any) => callback() } });
    const { w, target } = boot();
    const status = view(target);
    const base = { id: "r27-a", title: "Fixture pipefitter", company: "TEST", country: "Norwegia", location: "TEST", url: "https://example.test/a", rotation: { raw: "14/21" }, lastVerifiedAt: NOW, status: "active", sourceKind: "employer" };
    const result = { ...meta, jobs: [base, { ...base, id: "r27-b", rotation: { raw: "6/2" }, status: "uncertain" }] };
    const original = JSON.stringify(result);
    status.update(w.PIPE_RADAR_APP.applyRemote(result));
    w.toggleSaved("r27-a");
    await w.saveEntries();
    const saved = localStorage.getItem("pipe-radar-saved-v2");
    (document.getElementById("rotationFilter") as HTMLSelectElement).value = "free50";
    w.render();
    w.toggleCompare("r27-a");
    const cards = document.getElementById("grid")!.innerHTML;
    const comparison = document.getElementById("comparisonPanel")!.innerHTML;
    vi.advanceTimersByTime(24 * 60 * 60 * 1000 + 1);
    expect(target.textContent).toContain(WARNING);
    expect(document.getElementById("grid")!.innerHTML).toBe(cards);
    expect(document.getElementById("comparisonPanel")!.innerHTML).toBe(comparison);
    expect(document.querySelectorAll("#grid [data-job-id]")).toHaveLength(1);
    expect(localStorage.getItem("pipe-radar-saved-v2")).toBe(saved);
    expect(w.needsReview(w.toLegacyRemoteJob(result.jobs[1]))).toBe(true);
    expect(JSON.stringify(result)).toBe(original);
  });

  it("wires the real page refresh to age checking and retains the last remote copy on failure", async () => {
    const { html, w, target } = boot();
    const job = { id: "r27-remote", title: "Fixture", country: "Norwegia", url: "https://example.test/job", sources: [{ url: "https://example.test/job" }] };
    const payload = { schemaVersion: "2.4", status: "fresh", lastSuccessfulScanAt: "2026-10-10T12:00:00Z", generatedAt: NOW, sources: meta.sources, jobs: [job] };
    const fetcher = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify(payload))).mockRejectedValue(new Error("fixture offline"));
    w.loadJobs = (options: any) => loadJobs({ ...options, fetcher });
    w.createDataStatusView = view;
    const module = [...html.matchAll(/<script type="module">([\s\S]*?)<\/script>/g)].find(match => match[1]?.includes("refreshJobs"))![1]!;
    window.eval(module.replace(/^import .*;$/gm, ""));
    await vi.waitFor(() => expect((document.getElementById("refreshJobs") as HTMLButtonElement).disabled).toBe(false));
    expect(target.textContent).toContain(WARNING);
    expect(document.querySelector('[data-job-id="r27-remote"]')).not.toBeNull();
    document.getElementById("refreshJobs")!.click();
    await vi.waitFor(() => expect((document.getElementById("refreshJobs") as HTMLButtonElement).disabled).toBe(false));
    expect(target.textContent).toContain("KOPIA AWARYJNA");
    expect(target.textContent).toContain(WARNING);
    expect(target.textContent).toContain(new Date(payload.lastSuccessfulScanAt).toLocaleString("pl-PL"));
    expect(document.querySelector('[data-job-id="r27-remote"]')).not.toBeNull();
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("translates age warnings and reasons in both directions without losing source status", () => {
    const { w, target } = boot();
    renderDataStatus({ ...meta, mode: "fallback", lastSuccessfulScanAt: null }, target);
    window.eval(readFileSync("assets/i18n.js", "utf8"));
    document.dispatchEvent(new Event("DOMContentLoaded"));
    w.PIPE_RADAR_LANGUAGE.set("en");
    expect(target.textContent).toContain("DATA REQUIRES REVERIFICATION");
    expect(target.textContent).toContain("FALLBACK COPY");
    expect(target.textContent).toContain("Last successful scan: no valid date.");
    expect(target.textContent).toContain("The last successful scan date is missing.");
    w.PIPE_RADAR_LANGUAGE.set("pl");
    expect(target.textContent).toContain(WARNING);
    expect(target.textContent).toContain("KOPIA AWARYJNA");
  });
});
