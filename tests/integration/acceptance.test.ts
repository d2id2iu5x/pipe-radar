import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createAcceptanceHarness } from "./support/acceptance-harness.js";

describe("PIPE RADAR v2.4 acceptance", () => {
  it("updates jobs without a redeploy and preserves every fallback boundary", async () => {
    const indexBefore = readFileSync("index.html", "utf8");
    const harness = createAcceptanceHarness();

    const partial = await harness.scan(["employer", "portal", "down"]);
    expect(partial.published).toBe(true);
    expect(partial.snapshot.status).toBe("partial");
    expect(partial.snapshot.jobs).toHaveLength(1);
    expect(partial.snapshot.jobs[0]?.company).toBe("Primary Yard AS");
    expect(partial.snapshot.jobs[0]?.conflicts).toContain("rate");

    const remote = await harness.loadClient();
    expect(remote.mode).toBe("partial");
    expect(remote.jobs.some((job: { id: string }) => job.id.includes("shared-pipe-job"))).toBe(true);
    expect(remote.jobs.length).toBeGreaterThan(1);
    expect(readFileSync("index.html", "utf8")).toBe(indexBefore);

    const allDown = await harness.scan(["down"]);
    expect(allDown.published).toBe(true);
    expect(allDown.snapshot.status).toBe("fallback");
    expect(allDown.snapshot.jobs).toEqual(partial.snapshot.jobs);
    expect(allDown.snapshot.lastSuccessfulScanAt).toBe(partial.snapshot.lastSuccessfulScanAt);

    await harness.scan(["nav"]);
    const inactive = await harness.scan(["nav-inactive"]);
    expect(inactive.snapshot.jobs.some(job => job.id === "nav:uuid-expired")).toBe(false);
    expect(JSON.stringify(inactive.snapshot)).not.toContain("NAV Employer");

    const local = await harness.loadClient({ unavailable: true });
    expect(local).toMatchObject({ mode: "local", jobs: [{ id: "embedded-fallback" }] });
  });
});
