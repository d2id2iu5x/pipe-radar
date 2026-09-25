import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { extractJobPostings } from "../../src/sources/jsonld.js";

describe("JobPosting JSON-LD extraction", () => {
  it("extracts only JobPosting and resolves its relative URL", () => {
    const html = readFileSync("tests/fixtures/jsonld/job-posting.html", "utf8");
    const jobs = extractJobPostings(html, "https://example.test/careers/");
    expect(jobs).toHaveLength(1);
    expect(jobs[0]).toMatchObject({
      sourceJobId: "vac-42", title: "Industrial Pipefitter", company: "Example AS",
      location: "Bergen", country: "NO", url: "https://example.test/jobs/vac-42"
    });
  });

  it("ignores malformed JSON-LD instead of failing the page", () => {
    expect(extractJobPostings('<script type="application/ld+json">{broken</script>', "https://example.test")).toEqual([]);
  });
});
