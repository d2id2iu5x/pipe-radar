import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { createFinnAdapter } from "../../src/sources/finn.js";

describe("FINN adapter", () => {
  it("discovers canonical FINN job links and ignores navigation links", async () => {
    const search = readFileSync("tests/fixtures/finn/search.html", "utf8");
    const detail = readFileSync("tests/fixtures/finn/job.html", "utf8");
    const fetcher = vi.fn<typeof fetch>(async input => new Response(String(input).includes("/job/ad/") ? detail : search));
    const result = await createFinnAdapter().scan({ fetcher, now: () => new Date("2026-09-24T12:00:00.000Z") });
    expect(result.jobs.map(job => job.url)).toEqual(["https://www.finn.no/job/ad/462637858"]);
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it("does not claim success when search pages are unparseable", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => new Response("<html>changed</html>"));
    const result = await createFinnAdapter().scan({ fetcher, now: () => new Date("2026-09-24T12:00:00.000Z") });
    expect(result.status).toBe("partial");
  });
});
