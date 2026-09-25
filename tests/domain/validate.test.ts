import { describe, expect, it } from "vitest";
import { normalizeJob } from "../../src/domain/normalize.js";
import { toPublicSnapshot, validateSnapshot } from "../../src/domain/validate.js";

const now = "2026-09-24T12:00:00.000Z";
const job = normalizeJob({
  sourceId: "employer", sourceJobId: "42", sourceKind: "employer",
  url: "https://example.test/jobs/42", title: "Industrial Pipefitter",
  company: "Example AS", country: "Norway"
}, now);

function snapshot() {
  return {
    schemaVersion: "2.4",
    generatedAt: now,
    lastSuccessfulScanAt: now,
    status: "fresh",
    jobs: [job],
    sources: [{ id: "employer", kind: "employer", status: "success", lastCheckedAt: now }],
    internal: { parserMessage: "secret parser detail", token: "secret", lifecycle: { count: 1 } }
  };
}

describe("snapshot validation", () => {
  it("accepts a complete 2.4 snapshot", () => {
    expect(validateSnapshot(snapshot()).jobs).toHaveLength(1);
  });

  it("rejects duplicate job ids", () => {
    expect(() => validateSnapshot({ ...snapshot(), jobs: [job, job] })).toThrow(/duplicate/i);
  });

  it("rejects unsupported schema and invalid source URLs", () => {
    expect(() => validateSnapshot({ ...snapshot(), schemaVersion: "2.3" })).toThrow(/schema/i);
    expect(() => validateSnapshot({ ...snapshot(), jobs: [{ ...job, url: "javascript:alert(1)" }] })).toThrow(/url/i);
  });

  it("projects only safe public fields", () => {
    const publicValue = JSON.stringify(toPublicSnapshot(validateSnapshot(snapshot())));
    expect(publicValue).not.toContain("parserMessage");
    expect(publicValue).not.toContain("secret");
    expect(publicValue).not.toContain("lifecycle");
  });
});
