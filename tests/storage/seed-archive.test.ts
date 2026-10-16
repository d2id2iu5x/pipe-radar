import { describe, expect, it } from "vitest";
import { loadSeedSnapshot } from "../../src/storage/seed-snapshot.js";

describe("confirmed archive in recovery data", () => {
  it("retains the expired Indeed offer in the archive without inventing a new scan date", async () => {
    const seed = await loadSeedSnapshot();
    const job = seed.jobs.find(job => job.id === "stanship-indeed");
    expect(job?.status).toBe("archived");
    expect(job?.lastVerifiedAt).toBe("2026-09-15T00:00:00.000Z");
    expect(seed.jobs).toHaveLength(13);
    expect(seed.jobs.find(job => job.id === "adecco-kristiansund")?.status).toBe("archived");
    expect(seed.jobs.find(job => job.id === "jobs-norint")?.status).toBe("archived");
  });
});
