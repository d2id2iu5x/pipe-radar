import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it } from "vitest";

const reviewed = [
  {
    "id": "jobtech:31487016",
    "url": "https://arbetsformedlingen.se/platsbanken/annonser/31487016",
    "reason": "Potwierdzone 16.10.2026: Platsbanken oznacza termin zgłoszeń SAAB jako zakończony (15.10.2026)."
  },
  {
    "id": "bilfinger:https://jobs.bilfinger.com/job/Bridgwater-Piping-Superintendent-HPC-SOM-Bridgwater/1427056333/",
    "url": "https://jobs.bilfinger.com/job/Bridgwater-Piping-Superintendent-HPC-SOM-Bridgwater/1427056333/",
    "reason": "Potwierdzone 16.10.2026: Bilfinger informuje, że stanowisko zostało obsadzone."
  },
  {
    "id": "bilfinger:https://jobs.bilfinger.com/job/Wareham-Pipefitter-Perenco-Wytch-Farm-DOR-Wareham/1437593533/",
    "url": "https://jobs.bilfinger.com/job/Wareham-Pipefitter-Perenco-Wytch-Farm-DOR-Wareham/1437593533/",
    "reason": "Potwierdzone 16.10.2026: Bilfinger informuje, że stanowisko zostało obsadzone."
  },
  {
    "id": "fjordpipe-nav",
    "url": "https://arbeidsplassen.nav.no/stillinger/stilling/c83de50f-8800-4849-ade5-b387c7954951",
    "reason": "Potwierdzone 16.10.2026: NAV oznacza ogłoszenie Fjordpipe jako nieaktywne."
  },
  {
    "id": "tess-finn",
    "url": "https://www.finn.no/job/ad/473893035",
    "reason": "Potwierdzone 16.10.2026: FINN oznacza termin zgłoszeń jako zakończony (15.09.2026)."
  }
];
const seedIds = ["fjordpipe-nav", "tess-finn"];
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

describe("source audit archives (offline fixtures)", () => {
  beforeEach(() => { localStorage.clear(); document.body.replaceChildren(); });

  it.each(reviewed)("hides $id from default results but preserves its saved record", record => {
    const saved = JSON.stringify({[record.id]: {status: "Obserwuję", note: "Zachowaj moją notatkę", followUp: "2026-10-20"}});
    localStorage.setItem("pipe-radar-saved-v2", saved);
    const w = boot();
    const raw = {id: record.id, url: record.url, title: "Reviewed offer", company: "Source fixture", country: "Norwegia", location: "Test", status: "archived", sourceKind: "employer", sourceId: "fixture", lastVerifiedAt: "2026-09-15T00:00:00Z"};
    w.PIPE_RADAR_APP.applyRemote({mode: "partial", jobs: [raw, {...raw, id: "still-open", url: "https://example.test/open", status: "active"}]});
    expect([...document.querySelectorAll("#grid [data-job-id]")].map(card => card.getAttribute("data-job-id"))).toEqual(["still-open"]);
    expect(document.querySelector("#savedList")?.textContent).toContain("Archiwum");
    expect(localStorage.getItem("pipe-radar-saved-v2")).toBe(saved);
    archiveView(w);
    const card = document.querySelector("#grid [data-job-id]")!;
    expect(card.getAttribute("data-job-id")).toBe(record.id);
    expect(card.textContent).toContain(record.reason);
    expect(card.querySelector("a.source-link")?.getAttribute("href")).toBe(record.url);
    w.PIPE_RADAR_APP.applyRemote({mode: "local", jobs: []});
    expect(localStorage.getItem("pipe-radar-saved-v2")).toBe(saved);
    expect(document.querySelector("#grid [data-job-id]")?.getAttribute("data-job-id")).toBe(record.id);
    expect(w.toLegacyRemoteJob({...raw, status: "active"}).meta.reason).toBe("");
    expect(w.toLegacyRemoteJob({...raw, url: "https://example.test/different"}).meta.reason).not.toBe(record.reason);
  });

  it.each(seedIds)("keeps %s archived in the local recovery view", id => {
    const w = boot();
    expect(w.PIPE_RADAR_APP.fallback).toHaveLength(13);
    expect(w.PIPE_RADAR_APP.fallback.some((job: any) => job.id === id)).toBe(true);
    expect(document.querySelector(`#grid [data-job-id="${id}"]`)).toBeNull();
    archiveView(w);
    expect(document.querySelector(`#grid [data-job-id="${id}"]`)?.textContent).toContain(reviewed.find(record => record.id === id)!.reason);
  });

});
