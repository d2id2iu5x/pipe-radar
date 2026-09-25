import { describe, expect, it } from "vitest";
import { normalizeJob, normalizeRate } from "../../src/domain/normalize.js";

describe("job normalization", () => {
  it("does not invent missing commercial terms", () => {
    const job = normalizeJob({
      sourceId: "example", sourceJobId: "42", sourceKind: "portal",
      url: "https://example.test/jobs/42", title: "Pipefitter",
      company: "Example AS", country: "Norway"
    }, "2026-09-24T12:00:00.000Z");
    expect(job.rate.raw).toBe("Nie podano");
    expect(job.rotation.raw).toBe("Nie podano");
    expect(job.housing.raw).toBe("Nie podano");
    expect(job.travel.raw).toBe("Nie podano");
  });

  it("parses a guaranteed lower hourly rate without treating diet as base pay", () => {
    expect(normalizeRate("300 NOK/h + 200 NOK dieta/dzień")).toEqual({
      raw: "300 NOK/h + 200 NOK dieta/dzień", currency: "NOK",
      hourlyMin: 300, hourlyMax: 300, approximate: false
    });
  });

  it("parses an approximate range without inventing a guaranteed minimum", () => {
    expect(normalizeRate("~280–300 NOK/h")).toEqual({
      raw: "~280–300 NOK/h", currency: "NOK",
      hourlyMin: 280, hourlyMax: 300, approximate: true
    });
  });
});
