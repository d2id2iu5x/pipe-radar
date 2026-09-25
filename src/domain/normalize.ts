import type { DisplayTerm, Job, NormalizedRate, RawJob } from "./types.js";

const MISSING = "Nie podano";

function displayTerm(value?: string): DisplayTerm {
  const raw = value?.trim() || MISSING;
  return { raw, normalized: raw === MISSING ? null : raw.toLocaleLowerCase("pl-PL") };
}

export function normalizeRate(value?: string): NormalizedRate {
  const raw = value?.trim() || MISSING;
  const currency = raw.match(/\b(NOK|PLN|EUR|SEK|DKK)\b/i)?.[1]?.toUpperCase() ?? null;
  const hourly = raw.match(/(~|około|ca\.|approx(?:\.)?)?\s*(\d+(?:[.,]\d+)?)\s*(?:[–-]\s*(\d+(?:[.,]\d+)?))?\s*(?:NOK|PLN|EUR|SEK|DKK)?\s*(?:\/\s*h|\/h|per hour|godz\.?)/i);
  if (!hourly) return { raw, currency, hourlyMin: null, hourlyMax: null, approximate: /~|około|approx|ca\./i.test(raw) };
  const min = Number(hourly[2]?.replace(",", "."));
  const max = hourly[3] ? Number(hourly[3].replace(",", ".")) : min;
  return { raw, currency, hourlyMin: min, hourlyMax: max, approximate: Boolean(hourly[1]) };
}

function normalizeSkills(value?: string | string[]): string[] {
  const values = Array.isArray(value) ? value : (value ?? "").split(/[,;]+/);
  return [...new Set(values.map(item => item.trim()).filter(Boolean))];
}

export function normalizeJob(raw: RawJob, seenAt: string): Job {
  const rotation = displayTerm(raw.rotation);
  const job: Job = {
    id: `${raw.sourceId}:${raw.sourceJobId}`,
    sourceId: raw.sourceId,
    sourceJobId: raw.sourceJobId,
    sourceKind: raw.sourceKind,
    url: raw.url,
    sources: [{ sourceId: raw.sourceId, sourceJobId: raw.sourceJobId, kind: raw.sourceKind, url: raw.url }],
    title: raw.title.trim(),
    company: raw.company.trim(),
    country: raw.country.trim(),
    location: raw.location?.trim() || MISSING,
    employmentType: raw.employmentType?.trim() || MISSING,
    rotation,
    rate: normalizeRate(raw.rate),
    housing: displayTerm(raw.housing),
    travel: displayTerm(raw.travel),
    skills: normalizeSkills(raw.skills),
    tags: [...new Set(raw.tags ?? [])],
    description: raw.description?.trim() || "",
    publishedAt: raw.publishedAt ?? null,
    firstSeenAt: seenAt,
    lastSeenAt: seenAt,
    lastVerifiedAt: seenAt,
    missingSuccessfulScans: 0,
    status: "new",
    conflicts: [],
    fit: { base: raw.legacyFit ?? 0, adjustments: [], raw: raw.legacyFit ?? 0, score: 0 },
    legacyFit: raw.legacyFit ?? 0
  };
  return job;
}
