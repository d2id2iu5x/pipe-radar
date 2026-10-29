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
  // Distinct explicit IDs from one provider can be separate, equally named vacancies.
  if (left.sourceId === right.sourceId) return left.sourceJobId === right.sourceJobId;
  if (semantic(left) === semantic(right)) return true;
  return left.sourceJobId === right.sourceJobId && folded(left.title) === folded(right.title) && folded(left.location) === folded(right.location);
}

function conflictValues(jobs: Job[], field: "rate" | "rotation" | "housing" | "travel"): boolean {
  const values = jobs.map(job => job[field].raw).filter(value => value !== "Nie podano");
  return new Set(values).size > 1;
}

function geographyConflict(jobs: Job[], field: "country" | "location"): boolean {
  const values = jobs.map(job => folded(job[field])).filter(value => value && !["nie podano", "unknown", "not specified"].includes(value));
  return new Set(values).size > 1;
}

function ambiguousProviderIds(jobs: Job[]): boolean {
  return jobs.some((left, index) => jobs.slice(index + 1).some(right => {
    if (left.sourceId !== right.sourceId || left.sourceJobId === right.sourceJobId) return false;
    const leftUrl = canonicalUrl(left), rightUrl = canonicalUrl(right);
    return !leftUrl || !rightUrl || leftUrl !== rightUrl;
  }));
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
  const safeGroups = groups.flatMap(group => {
    if (!ambiguousProviderIds(group)) return [{ jobs: group, ambiguous: false }];
    // A third source may transitively bridge two distinct IDs. Do not choose one
    // matching provider vacancy arbitrarily: keep every explicit identity for review.
    const byIdentity = new Map<string, Job[]>();
    for (const job of group) {
      const key = JSON.stringify([job.sourceId, job.sourceJobId]);
      byIdentity.set(key, [...(byIdentity.get(key) ?? []), job]);
    }
    return [...byIdentity.values()].map(jobs => ({ jobs, ambiguous: true }));
  });
  return safeGroups.map(({ jobs: group, ambiguous }) => {
    const ranked = [...group].sort((a, b) => PRECEDENCE[b.sourceKind] - PRECEDENCE[a.sourceKind]);
    const primary = ranked[0];
    if (!primary) throw new Error("Cannot merge an empty group");
    // Same URL can carry conflicting observed metadata; retain both pieces of evidence.
    const sources = [...new Map(ranked.flatMap(job => job.sources).map(source => [JSON.stringify([
      source.sourceId, source.sourceJobId, source.url,
      source.reportedSourceJobId ?? null, source.reportedCountry ?? null, source.reportedLocation ?? null
    ]), source])).values()];
    const conflicts = [
      ...(ambiguous ? ["sourceJobId"] : []),
      ...(["rate", "rotation", "housing", "travel"] as const).filter(field => conflictValues(group, field)),
      ...(["country", "location"] as const).filter(field => geographyConflict(group, field))
    ];
    return { ...primary, sources, conflicts: [...new Set([...group.flatMap(job => job.conflicts), ...conflicts])] };
  });
}
