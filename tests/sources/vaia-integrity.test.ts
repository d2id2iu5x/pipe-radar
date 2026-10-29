import { describe, expect, it, vi } from "vitest";
import { extractJobPostings } from "../../src/sources/jsonld.js";
import { createConfiguredPageAdapters } from "../../src/sources/configured-pages.js";
import { normalizeJob } from "../../src/domain/normalize.js";
import { mergeJobs } from "../../src/domain/dedupe.js";
import { applyLifecycle, type LifecycleState } from "../../src/domain/lifecycle.js";
import type { RawJob } from "../../src/domain/types.js";

const now = "2026-10-28T12:00:00.000Z";
const root = "https://talents.vaia.com/companies/moja-norwegia/";
const firstUrl = `${root}wind-lake/pipe-fitter-norwegia-116660164/`;
const secondUrl = `${root}wind-lake/pipe-fitter-offshore-shipyard-norway-flights-housing-116661769/`;

// Synthetic markup reproduces the parser contract; it is not a captured Vaia page.
function page(url: string, options: { identifier?: unknown; country?: string; description?: string; title?: string } = {}) {
  return `<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org", "@type": "JobPosting", url,
    identifier: options.identifier ?? { "@type": "PropertyValue", name: "Moja Norwegia", value: "fixture-42" },
    title: options.title ?? "Pipe fitter Norwegia", hiringOrganization: { name: "Moja Norwegia" },
    jobLocation: { address: { addressCountry: options.country ?? "US", addressLocality: "Wind Lake" } },
    description: options.description ?? "Synthetic test: Praca w Norwegii. No actual recruitment.",
  })}</script>`;
}
async function scan(fixtures: Record<string, string>) {
  const index = Object.keys(fixtures).map(url => `<a href="${url}">Pipe fitter</a>`).join("");
  const fetcher = vi.fn<typeof fetch>(async input => {
    const url = String(input);
    if (url === root) return new Response(index);
    if (Object.hasOwn(fixtures, url)) return new Response(fixtures[url]);
    throw new Error(`Unexpected URL in fixture-only test: ${url}`);
  });
  const adapter = createConfiguredPageAdapters().find(item => item.id === "vaia")!;
  const result = await adapter.scan({ fetcher, now: () => new Date(now) });
  expect(fetcher).toHaveBeenCalledTimes(Object.keys(fixtures).length + 1);
  return result;
}
function raw(overrides: Partial<RawJob> = {}): RawJob {
  return { sourceId: "vaia", sourceKind: "aggregator", sourceJobId: "fixture-42", url: firstUrl,
    title: "Pipe fitter", company: "Synthetic employer", country: "US", location: "Wind Lake", ...overrides };
}

describe("A-16 source identity and unresolved location evidence", () => {
  it("reads PropertyValue.value as the identifier, never its publisher name", () => {
    const [job] = extractJobPostings(page(firstUrl), firstUrl);
    expect(job?.sourceJobId).toBe("fixture-42");
  });

  it("falls back to the posting URL when an identifier has only a name", () => {
    const [job] = extractJobPostings(page(firstUrl, { identifier: { name: "Moja Norwegia" } }), firstUrl);
    expect(job?.sourceJobId).toBe(firstUrl);
  });

  it("keeps separate Vaia URL identities even if both reported identifiers are the same publisher", async () => {
    const result = await scan({
      [firstUrl]: page(firstUrl, { identifier: "Moja Norwegia" }),
      [secondUrl]: page(secondUrl, { identifier: "Moja Norwegia", title: "Pipe fitter offshore" }),
    });
    expect(result.jobs.map(job => job.sourceJobId)).toEqual(["116660164", "116661769"]);
    const normalized = result.jobs.map(job => normalizeJob(job, now));
    expect(mergeJobs(normalized)).toHaveLength(2);
    expect(normalized.map(job => job.sources[0])).toEqual(expect.arrayContaining([
      expect.objectContaining({ sourceJobId: "116660164", reportedSourceJobId: "Moja Norwegia", reportedCountry: "US", reportedLocation: "Wind Lake" }),
      expect.objectContaining({ sourceJobId: "116661769", reportedSourceJobId: "Moja Norwegia" }),
    ]));
  });

  it("marks body-versus-country disagreement without substituting the country or location", async () => {
    const result = await scan({ [firstUrl]: page(firstUrl) });
    const job = normalizeJob(result.jobs[0]!, now);
    expect(job).toMatchObject({ country: "US", location: "Wind Lake", conflicts: ["country"] });
    expect(job.description).toBe("Synthetic test: Praca w Norwegii. No actual recruitment.");
    const observed = applyLifecycle({ current: [job], successfulSourceIds: ["vaia"], inactiveIds: [], now });
    expect(observed.jobs[0]?.status).toBe("uncertain");
  });

  it("does not infer country from the title or fill unknown geography", async () => {
    const titleOnly = await scan({ [firstUrl]: page(firstUrl, { description: "Synthetic fixture only" }) });
    expect(normalizeJob(titleOnly.jobs[0]!, now)).toMatchObject({ country: "US", conflicts: [] });
    const unknown = await scan({ [firstUrl]: page(firstUrl, { country: "Nie podano" }) });
    expect(normalizeJob(unknown.jobs[0]!, now)).toMatchObject({ country: "Nie podano", conflicts: [] });
  });

  it("accepts a consistent country field without manufacturing a location conflict", async () => {
    const result = await scan({ [firstUrl]: page(firstUrl, { country: "NO" }) });
    expect(normalizeJob(result.jobs[0]!, now)).toMatchObject({ country: "Norwegia", conflicts: [] });
  });

  it("keeps distinct same-provider IDs even when descriptions of vacancies look identical", () => {
    const a = normalizeJob(raw({ sourceJobId: "116660164" }), now);
    const b = normalizeJob(raw({ sourceJobId: "116661769", url: secondUrl }), now);
    expect(mergeJobs([a, b])).toHaveLength(2);
  });

  it("does not let a third portal bridge distinct provider IDs in any input order", () => {
    const a = normalizeJob(raw({ sourceJobId: "116660164" }), now);
    const b = normalizeJob(raw({ sourceJobId: "116661769", url: secondUrl }), now);
    const bridge = normalizeJob(raw({ sourceId: "other-portal", sourceJobId: "p", url: "https://example.test/job/p" }), now);
    for (const order of [[a, b, bridge], [a, bridge, b], [b, a, bridge], [b, bridge, a], [bridge, a, b], [bridge, b, a]]) {
      const merged = mergeJobs(order);
      expect(merged.map(job => job.id).sort()).toEqual([a.id, b.id, bridge.id].sort());
      expect(merged.flatMap(job => job.sources).map(source => source.url).sort()).toEqual([firstUrl, secondUrl, bridge.url].sort());
      expect(merged.every(job => job.conflicts.includes("sourceJobId"))).toBe(true);
    }
    expect(a.conflicts).toEqual([]);
    expect(b.conflicts).toEqual([]);
  });

  it("retains source geography and flags conflicting countries when cross-source records merge", () => {
    const a = normalizeJob(raw({ sourceId: "portal-a" }), now);
    const b = normalizeJob(raw({ sourceId: "portal-b", country: "NO", url: "https://example.test/job/42" }), now);
    const [merged] = mergeJobs([a, b]);
    expect(merged?.conflicts).toContain("country");
    expect(merged?.sources.map(source => source.reportedCountry)).toEqual(expect.arrayContaining(["US", "NO"]));
  });

  it("retains both reported geographies even when conflicting observations use the same URL", () => {
    const a = normalizeJob(raw(), now);
    const b = normalizeJob(raw({ country: "NO" }), now);
    const [merged] = mergeJobs([a, b]);
    expect(merged?.conflicts).toContain("country");
    expect(merged?.sources.map(source => source.reportedCountry)).toEqual(expect.arrayContaining(["US", "NO"]));
    expect(mergeJobs([a, a])[0]?.sources).toHaveLength(1);
  });

  it.each(["2026-10-27T12:00:00.000Z", "2026-10-01T12:00:00.000Z"])("does not label an observed conflicted offer new or active (first seen %s)", firstSeenAt => {
    const job = { ...normalizeJob(raw(), firstSeenAt), conflicts: ["country"] };
    const result = applyLifecycle({ current: [job], successfulSourceIds: ["vaia"], inactiveIds: [], now });
    expect(result.jobs[0]?.status).toBe("uncertain");
  });

  it("does not silently clear a recorded identity/geography conflict on the next observation", () => {
    const incoming = normalizeJob(raw(), now);
    const prior = { ...incoming, firstSeenAt: "2026-09-01T12:00:00.000Z", status: "uncertain" as const, conflicts: ["country", "sourceJobId"] };
    const previous: LifecycleState = { jobs: { [prior.id]: prior }, audit: {} };
    const result = applyLifecycle({ current: [incoming], previous, successfulSourceIds: ["vaia"], inactiveIds: [], now });
    expect(result.jobs[0]?.status).toBe("uncertain");
    expect(result.jobs[0]?.conflicts).toEqual(expect.arrayContaining(["country", "sourceJobId"]));
    expect(prior.conflicts).toEqual(["country", "sourceJobId"]);
  });

  it("holds a legacy conflicted active record for review without refreshing its observation dates", () => {
    const prior = { ...normalizeJob(raw(), "2026-10-27T12:00:00.000Z"), status: "active" as const, conflicts: ["country", "sourceJobId"] };
    const result = applyLifecycle({ current: [], previous: { jobs: { [prior.id]: prior }, audit: {} }, successfulSourceIds: [], inactiveIds: [], now });
    expect(result.jobs[0]?.status).toBe("uncertain");
    expect(result.jobs[0]?.lastSeenAt).toBe(prior.lastSeenAt);
    expect(result.jobs[0]?.lastVerifiedAt).toBe(prior.lastVerifiedAt);
  });
});
