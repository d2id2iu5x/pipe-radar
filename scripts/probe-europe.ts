/** Bounded read-only smoke test; never updates the production snapshot. */
import { mkdir, writeFile } from 'node:fs/promises';
import { createJobtechAdapter } from '../src/sources/jobtech.js';
import { createEuropeanPageAdapters } from '../src/sources/europe-pages.js';
import { normalizeJob } from '../src/domain/normalize.js';
const results = await Promise.all([createJobtechAdapter(), ...createEuropeanPageAdapters()].map(async adapter => {
  const startedAt = new Date().toISOString();
  try {
    const r = await adapter.scan({ now: () => new Date(), maxPages: 1 });
    return { id: adapter.id, status: r.status, diagnosticCode: r.diagnosticCode, http: r.http,
      count: r.jobs.length, countries: [...new Set(r.jobs.map(j => normalizeJob(j, startedAt).country))],
      examples: r.jobs.slice(0, 5).map(j => ({ title:j.title, country:j.country, url:j.url })), checkedAt: new Date().toISOString() };
  } catch (error) { return {id:adapter.id,status:'failed',error:error instanceof Error ? error.message : String(error),checkedAt:new Date().toISOString()}; }
}));
await mkdir('review', {recursive:true});
await writeFile('review/europe-live-probe.json', JSON.stringify(results,null,2));
console.log(JSON.stringify(results,null,2));
