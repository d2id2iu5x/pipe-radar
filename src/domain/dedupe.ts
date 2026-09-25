import { createHash } from "node:crypto";
import type { Job, SourceKind } from "./types.js";

const PRECEDENCE: Record<SourceKind, number> = { employer: 4, "official-api": 3, portal: 2, aggregator: 1 };

function folded(value: string): string {
  return value.normalize("NFKD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("en").replace(/\W+/g, " ").trim();
}

function canonicalUrl(job: Job): string {
  let url: URL | undefined;
  try { url = new URL(job.url); } catch { /* validation owns invalid URLs */ }
  return url ? `${url.hostname}${url.pathname}`.replace(/\/$/, "") : "";
}

function semantic(job: Job): string {
  return createHash("sha256").update(`${folded(job.company)}|${folded(job.title)}|${folded(job.location)}`).digest("hex");
}

function sameVacancy(left: Job, right: Job): boolean {
  const leftUrl = canonicalUrl(left), rightUrl = canonicalUrl(right);
  if (leftUrl && leftUrl === rightUrl) return true;
  if (left.sourceId === right.sourceId && left.sourceJobId === right.sourceJobId) return true;
  if (semantic(left) === semantic(right)) return true;
  return left.sourceJobId === right.sourceJobId && folded(left.title) === folded(right.title) && folded(left.location) === folded(right.location);
}

function conflictValues(jobs: Job[], field: "rate" | "rotation" | "housing" | "travel"): boolean {
  const values = jobs.map(job => job[field].raw).filter(value => value !== "Nie podano");
  return new Set(values).size > 1;
}

export function mergeJobs(jobs: Job[]): Job[] {
  const groups: Job[][] = [];
  for (const job of jobs) {
    const matching = groups.filter(group => group.some(existing => sameVacancy(existing, job)));
    if (!matching.length) { groups.push([job]); continue; }
    const merged = [job, ...matching.flat()];
    for (const group of matching) groups.splice(groups.indexOf(group), 1);
    groups.push(merged);
  }
  return groups.map(group => {
    const ranked = [...group].sort((a, b) => PRECEDENCE[b.sourceKind] - PRECEDENCE[a.sourceKind]);
    const primary = ranked[0];
    if (!primary) throw new Error("Cannot merge an empty group");
    const sources = [...new Map(ranked.flatMap(job => job.sources).map(source => [`${source.sourceId}:${source.sourceJobId}:${source.url}`, source])).values()];
    const conflicts = (["rate", "rotation", "housing", "travel"] as const).filter(field => conflictValues(group, field));
    return { ...primary, sources, conflicts: [...new Set([...group.flatMap(job => job.conflicts), ...conflicts])] };
  });
}
