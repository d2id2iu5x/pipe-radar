import { describe, expect, it } from "vitest";
import { mergeJobs } from "../../src/domain/dedupe.js";
import { normalizeJob } from "../../src/domain/normalize.js";
import type { RawJob } from "../../src/domain/types.js";

const now = "2026-09-24T12:00:00.000Z";
const raw = (overrides: Partial<RawJob> = {}) => ({
  sourceId: "portal", sourceJobId: "shared-vacancy", sourceKind: "portal" as const,
  url: "https://portal.test/job/shared-vacancy", title: "Industrial Pipefitter",
  company: "Recruitment copy", country: "Norway", location: "Bergen",
  rate: "280 NOK/h", ...overrides
});

describe("job deduplication", () => {
  it("prefers employer data but retains every source URL", () => {
    const portalCopy = normalizeJob(raw(), now);
    const employerCopy = normalizeJob(raw({
      sourceId: "employer", sourceKind: "employer", company: "Real Employer AS",
      url: "https://employer.test/jobs/shared-vacancy", rate: "300 NOK/h"
    }), now);
    const merged = mergeJobs([portalCopy, employerCopy]);
    expect(merged).toHaveLength(1);
    expect(merged[0]?.company).toBe(employerCopy.company);
    expect(merged[0]?.sources.map(source => source.url)).toEqual(
      expect.arrayContaining([portalCopy.url, employerCopy.url])
    );
  });

  it("marks unresolved commercial conflicts", () => {
    const portalWith280 = normalizeJob(raw(), now);
    const employerWith300 = normalizeJob(raw({
      sourceId: "employer", sourceKind: "employer", url: "https://employer.test/jobs/shared-vacancy", rate: "300 NOK/h"
    }), now);
    const [job] = mergeJobs([portalWith280, employerWith300]);
    expect(job?.conflicts).toContain("rate");
  });

  it("does not merge unrelated jobs that reuse a long portal id", () => {
    const first = normalizeJob(raw({ sourceId: "one", sourceJobId: "12345678", company: "A AS", url: "https://one.test/jobs/12345678" }), now);
    const second = normalizeJob(raw({ sourceId: "two", sourceJobId: "12345678", company: "B AS", location: "Oslo", url: "https://two.test/jobs/12345678" }), now);
    expect(mergeJobs([first, second])).toHaveLength(2);
  });

  it("merges semantic duplicates even when their valid URLs and ids differ", () => {
    const first = normalizeJob(raw({ sourceId: "one", sourceJobId: "one-12345678", company: "Same AS", url: "https://one.test/jobs/a" }), now);
    const second = normalizeJob(raw({ sourceId: "two", sourceJobId: "two-87654321", company: "Same AS", url: "https://two.test/jobs/b" }), now);
    expect(mergeJobs([first, second])).toHaveLength(1);
  });
});
