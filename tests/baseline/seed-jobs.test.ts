import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("v2.3.1 seed", () => {
  it("preserves all 13 stable job ids", () => {
    const jobs = JSON.parse(readFileSync("data/seed-jobs.json", "utf8"));
    expect(jobs).toHaveLength(13);
    expect(new Set(jobs.map((job: { id: string }) => job.id)).size).toBe(13);
    expect(jobs.map((job: { id: string }) => job.id)).toContain("rempol-rotation");
  });
});
