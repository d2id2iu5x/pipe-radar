import { describe, expect, it } from "vitest";
import { calculateFit } from "../../src/domain/fit.js";
import { normalizeJob } from "../../src/domain/normalize.js";
import { isRelevantJob } from "../../src/domain/relevance.js";

const now = "2026-09-24T12:00:00.000Z";

describe("relevance and FIT", () => {
  it("requires a pipe trade title and industrial context for generic plumbing", () => {
    expect(isRelevantJob({ title: "Industrial Pipefitter", description: "shipyard piping" })).toBe(true);
    expect(isRelevantJob({ title: "Rørlegger", description: "bad og kjøkken i private hjem" })).toBe(false);
    expect(isRelevantJob({ title: "Rørlegger", description: "industri og maritime prosjekter" })).toBe(true);
  });

  it("preserves the legacy base and clamps the public score", () => {
    const job = normalizeJob({
      sourceId: "test", sourceJobId: "1", sourceKind: "portal",
      url: "https://example.test/1", title: "Pipefitter", company: "A",
      country: "Norway", skills: "izometria, ermeto, hydraulika, prefabrykacja",
      legacyFit: 110
    }, now);
    expect(calculateFit(job)).toMatchObject({ base: 110, raw: 110, score: 100 });
  });

  it("documents profile adjustments independently of the base", () => {
    const job = normalizeJob({
      sourceId: "test", sourceJobId: "2", sourceKind: "portal",
      url: "https://example.test/2", title: "Shipyard Pipefitter", company: "B",
      country: "Norway", rotation: "4/2", skills: "minimum 5 lat, English, izometria",
      legacyFit: 80
    }, now);
    const fit = calculateFit(job, { experience: 3, language: "basic", rotation: "3/1", focus: "shipyard", skills: ["izometria"] });
    expect(fit.adjustments.map(item => item.points)).toEqual(expect.arrayContaining([-12, -8, 5, -7]));
    expect(fit.score).toBe(58);
  });
});
