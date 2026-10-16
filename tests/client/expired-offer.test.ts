import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it } from "vitest";

const expiredId = "stanship-indeed";
const expiredUrl = "https://pl.indeed.com/viewjob?jk=c15ed66dface1e9c";
function boot() {
  const html = readFileSync("index.html", "utf8");
  document.documentElement.innerHTML = html;
  window.eval([...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match => match[1]).join("\n"));
  return window as any;
}
function archiveView(w: any) {
  (document.getElementById("archiveFilter") as HTMLSelectElement).value = "archived";
  w.render();
}

describe("confirmed expired offer (offline regression)", () => {
  beforeEach(() => { localStorage.clear(); document.body.replaceChildren(); });

  it("keeps the confirmed expired Indeed record out of default local results", () => {
    const w = boot();
    expect(w.PIPE_RADAR_APP.fallback.some((job: any) => job.id === expiredId)).toBe(true);
    expect(document.querySelector(`#grid [data-job-id="${expiredId}"]`)).toBeNull();
    archiveView(w);
    const card = document.querySelector(`#grid [data-job-id="${expiredId}"]`)!;
    expect(card).not.toBeNull();
    expect(card.textContent).toContain("Indeed oznacza ofertę jako wygasłą");
    expect(card.querySelector("a.source-link")?.getAttribute("href")).toBe(expiredUrl);
  });

  it("hides an archived remote record while retaining the saved note and archive reason", () => {
    const saved = JSON.stringify({ [expiredId]: { status: "Obserwuję", note: "Moja notatka", followUp: "2026-10-20" } });
    localStorage.setItem("pipe-radar-saved-v2", saved);
    const w = boot();
    const raw = { id: expiredId, url: expiredUrl, title: "Monter rurociągów", company: "Stanship", country: "Norwegia", location: "Norwegia", lastVerifiedAt: "2026-09-15T00:00:00Z", status: "archived", sourceKind: "aggregator" };
    w.PIPE_RADAR_APP.applyRemote({ mode: "partial", jobs: [raw] });
    expect(document.querySelector(`#grid [data-job-id="${expiredId}"]`)).toBeNull();
    expect(document.querySelector("#savedList")?.textContent).toContain("Archiwum");
    expect(localStorage.getItem("pipe-radar-saved-v2")).toBe(saved);
    archiveView(w);
    expect(document.querySelector(`#grid [data-job-id="${expiredId}"]`)?.textContent).toContain("Indeed oznacza ofertę jako wygasłą");
    w.PIPE_RADAR_APP.applyRemote({ mode: "local", jobs: [] });
    expect(localStorage.getItem("pipe-radar-saved-v2")).toBe(saved);
    expect(w.toLegacyRemoteJob(raw).meta.archived).toBe(true);
  });

  it("does not label an unrelated archive or a reobserved offer as confirmed expired", () => {
    const w = boot();
    const base = { id: expiredId, url: expiredUrl, country: "Norwegia", status: "archived" };
    expect(w.toLegacyRemoteJob({ ...base, url: "https://example.test/different" }).meta.reason || "").not.toContain("Indeed");
    expect(w.toLegacyRemoteJob({ ...base, status: "active" }).meta.archived).toBe(false);
    expect(w.toLegacyRemoteJob({ ...base, status: "active" }).meta.reason || "").toBe("");
  });
});
