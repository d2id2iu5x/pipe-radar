import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { createConfiguredPageAdapters } from "../../src/sources/configured-pages.js";

describe("configured public career pages", () => {
  it("extracts same-origin relevant detail links then parses JobPosting", async () => {
    const index = readFileSync("tests/fixtures/pages/career-index.html", "utf8");
    const detail = readFileSync("tests/fixtures/pages/job-detail.html", "utf8");
    const fetcher = vi.fn<typeof fetch>(async input => new Response(String(input).includes("pipefitter-42") ? detail : index));
    const result = await createConfiguredPageAdapters()[0]!.scan({ fetcher, now: () => new Date("2026-09-24T12:00:00.000Z") });
    expect(result.jobs[0]?.title).toMatch(/pipefitter/i);
    expect(result.jobs[0]?.url).toBe("https://www.adecco.com/nb-no/jobs/pipefitter-42");
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("reports a blocked configured page without inventing jobs", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => new Response("Verify you are human", { status: 403 }));
    const result = await createConfiguredPageAdapters()[0]!.scan({ fetcher, now: () => new Date("2026-09-24T12:00:00.000Z") });
    expect(result).toMatchObject({ status: "blocked", jobs: [] });
  });

  it("reports total HTTP failure as failed, not partial", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => new Response("down", { status: 500 }));
    const result = await createConfiguredPageAdapters()[0]!.scan({ fetcher, now: () => new Date("2026-09-24T12:00:00.000Z") });
    expect(result.status).toBe("failed");
  });

  it("does not claim success for an unparseable 200 page", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => new Response("<html><body>unexpected layout</body></html>"));
    const result = await createConfiguredPageAdapters()[0]!.scan({ fetcher, now: () => new Date("2026-09-24T12:00:00.000Z") });
    expect(result.status).toBe("partial");
  });
});
