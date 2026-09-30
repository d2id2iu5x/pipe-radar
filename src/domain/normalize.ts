import { normalizeCountry } from "./europe.js";
import type { DisplayTerm, Job, NormalizedRate, RawJob } from "./types.js";

const MISSING = "Nie podano";

function displayTerm(value?: string): DisplayTerm {
  const raw = value?.trim() || MISSING;
  return { raw, normalized: raw === MISSING ? null : raw.toLocaleLowerCase("pl-PL") };
}

export function normalizeRate(value?: string): NormalizedRate {
  const raw = value?.trim() || MISSING;
  const codes = "NOK|PLN|EUR|SEK|DKK|GBP|CHF|CZK|RON|HUF|ISK|BGN|RSD|BAM|MKD|ALL|MDL|UAH|TRY|RUB|BYN|GEL|AMD|AZN|KZT";
  const unit = "(?:h(?:our)?s?\\b|godz\\.?|godzin[ęeya]|Stunde[n]?|heure[s]?|timme|tunti)";
  const number = "(\\d+(?:[.,]\\d+)?)";
  const between = "\\s*(?:[–—-]\\s*" + number + ")?\\s*";
  const suffix = new RegExp(number + between + "(" + codes + ")?\\s*(?:brutto|netto|gross|net)?\\s*(?:/|per\\s+)\\s*" + unit, "i");
  const hourly = raw.match(suffix);
  const fallbackCurrency = raw.match(new RegExp("\\b(" + codes + ")\\b", "i"))?.[1]?.toUpperCase() ?? null;
  if (!hourly) return { raw, currency: fallbackCurrency, hourlyMin: null, hourlyMax: null, approximate: /~|około|approx|ca\./i.test(raw) };
  const min = Number(hourly[1]?.replace(",", "."));
  const max = hourly[2] ? Number(hourly[2].replace(",", ".")) : min;
  const currency = hourly[3]?.toUpperCase() ?? null;
  const before = raw.slice(0, hourly.index);
  const approximate = /(?:~|około|ok\.|ca\.|approx\.?)\s*$/i.test(before);
  if (/\d[\d\s.,]*$/.test(before) || !Number.isFinite(min) || !Number.isFinite(max) || max < min || /[-−]\s*$/.test(before)) return { raw, currency, hourlyMin: null, hourlyMax: null, approximate };
  return { raw, currency, hourlyMin: min, hourlyMax: max, approximate };
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
    country: normalizeCountry(raw.country),
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
