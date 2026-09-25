import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("scheduled scan workflow", () => {
  it("runs after code changes without looping on generated snapshots", () => {
    const workflow = readFileSync(".github/workflows/scan-jobs.yml", "utf8");
    expect(workflow).toContain("  push:");
    expect(workflow).toContain("      - data/jobs.json");
    expect(workflow).toContain("      - data/scan-state.json");
  });
});
