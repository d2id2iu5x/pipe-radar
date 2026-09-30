import { describe, expect, it } from "vitest";
import { normalizeJob, normalizeRate } from "../../src/domain/normalize.js";
import { isRelevantJob } from "../../src/domain/relevance.js";
import { getSourceRegistry } from "../../src/sources/registry.js";

const raw = (country: string) => ({ sourceId: "test", sourceJobId: "1", sourceKind: "employer" as const, title: "Pipefitter", company: "Test", country, url: "https://example.test/job" });
describe("European search coverage", () => {
  it.each([["DE","Niemcy"],["Germany","Niemcy"],["Deutschland","Niemcy"],["GB","Wielka Brytania"],["United Kingdom","Wielka Brytania"],["CH","Szwajcaria"],["Sverige","Szwecja"],["NL","Holandia"],["Norge","Norwegia"],["FR","Francja"],["Czechia","Czechy"],["Suomi","Finlandia"]])("normalizes %s without guessing from the source country", (input, expected) => {
    expect(normalizeJob(raw(input), "2026-09-30T00:00:00Z").country).toBe(expected);
  });
  it("preserves an explicitly unknown country", () => {
    expect(normalizeJob(raw("Nie podano"), "2026-09-30T00:00:00Z").country).toBe("Nie podano");
  });
  it.each(["Rohrschlosser", "Rohrleitungsbauer", "Tuyaut eur".replace(" ", ""), "Pijpfitter", "Industrirörmontör", "Teollisuusputkiasentaja", "Tubista industriale", "Montador de tuberías industriales", "Montador de tubagem industrial", "Potrubář", "Potrubár", "Lăcătuș mecanic conducte", "Csőszerelő", "Monter cevovoda", "Boru montajcısı", "Монтажник трубопроводів"])("recognizes a pipe trade title: %s", title => {
    expect(isRelevantJob({ title, description: "industrial piping prefabrication" })).toBe(true);
  });
  it.each(["Software engineer", "Truck driver", "Electrician", "Plumber domestic bathrooms"])("does not widen the trade to unrelated job %s", title => {
    expect(isRelevantJob({ title, description: "ordinary work" })).toBe(false);
  });
  it("registers additional European sources", () => {
    expect(getSourceRegistry().map(source => source.id)).toEqual(expect.arrayContaining(["nav", "finn", "jobtech", "bilfinger"]));
  });
  it.each(["GBP", "CHF", "CZK", "RON", "HUF"])("keeps %s pay in its original currency", currency => {
    expect(normalizeRate(`25 ${currency}/h`)).toMatchObject({ currency, hourlyMin: 25, hourlyMax: 25 });
  });
  it("does not treat a daily allowance as hourly pay", () => {
    expect(normalizeRate("280 NOK/h + 350 EUR/day")).toMatchObject({ currency: "NOK", hourlyMin: 280 });
  });
});
