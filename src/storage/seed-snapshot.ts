import { readFile } from "node:fs/promises";
import { calculateFit } from "../domain/fit.js";
import { normalizeJob } from "../domain/normalize.js";
import type { Snapshot, SourceKind } from "../domain/types.js";
import { validateSnapshot } from "../domain/validate.js";

function sourceKind(origin: string): SourceKind {
  if (origin === "employer") return "employer";
  if (origin === "nav") return "official-api";
  if (origin === "aggregator") return "aggregator";
  return "portal";
}

export async function loadSeedSnapshot(): Promise<Snapshot> {
  const seed = JSON.parse(await readFile(new URL("../../data/seed-jobs.json", import.meta.url), "utf8")) as Record<string, unknown>[];
  const generatedAt = "2026-09-15T00:00:00.000Z";
  const sources = seed.map(item => {
    const meta = item.meta && typeof item.meta === "object" ? item.meta as Record<string, unknown> : {};
    const id = `seed-${String(item.id)}`;
    return { id, kind: sourceKind(String(meta.origin ?? "portal")), status: "success" as const, lastCheckedAt: generatedAt };
  });
  const jobs = seed.map((item, index) => {
    const meta = item.meta && typeof item.meta === "object" ? item.meta as Record<string, unknown> : {};
    const kind = sources[index]!.kind;
    const sourceId = sources[index]!.id;
    const job = normalizeJob({
      sourceId, sourceJobId: String(item.id), sourceKind: kind, url: String(item.url),
      title: String(item.title), company: String(item.company), country: String(item.country),
      location: String(item.location ?? "Nie podano"), employmentType: String(item.type ?? "Nie podano"),
      rotation: String(item.rotation ?? "Nie podano"), rate: String(item.rate ?? "Nie podano"),
      housing: String(item.housing ?? "Nie podano"), travel: String(item.travel ?? "Nie podano"),
      skills: String(item.skills ?? ""), tags: Array.isArray(item.tags) ? item.tags.map(String) : [],
      legacyFit: Number(item.fit ?? 0)
    }, generatedAt);
    job.id = String(item.id);
    job.status = meta.archived ? "archived" : "active";
    job.fit = calculateFit(job);
    return job;
  });
  return validateSnapshot({ schemaVersion: "2.4", generatedAt, lastSuccessfulScanAt: generatedAt, status: "fallback", jobs, sources });
}
