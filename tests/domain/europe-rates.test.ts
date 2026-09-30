import { describe, expect, it } from 'vitest';
import { normalizeRate } from '../../src/domain/normalize.js';
import { europeanSearchLinks } from '../../src/domain/europe.js';
describe('European pay precision', () => {
  it('does not confuse allowance currency with the hourly currency', () => {
    expect(normalizeRate('350 EUR/day + 280 NOK/h')).toMatchObject({currency:'NOK',hourlyMin:280});
  });
  it.each(['1 250 EUR/h','1.250,00 EUR/h','-25 GBP/h','40–30 EUR/h'])('does not partially parse an ambiguous amount: %s', raw => {
    expect(normalizeRate(raw).hourlyMin).toBeNull();
  });
  it.each(['4200 EUR/month','500 GBP/week','300 CHF/day'])('does not turn %s into hourly pay', raw => {
    expect(normalizeRate(raw).hourlyMin).toBeNull();
  });
  it('keeps German synonyms separate rather than requiring an unlikely phrase', () => {
    const q=new URL(europeanSearchLinks('Niemcy').web).searchParams.get('q');
    expect(q).toContain('"Rohrschlosser" OR "Rohrleitungsbauer"');
  });
});
