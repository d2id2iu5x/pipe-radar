import { describe, expect, it, vi } from "vitest";
import { createJobtechAdapter } from "../../src/sources/jobtech.js";
import { createEuropeanPageAdapters, robotsAllows } from "../../src/sources/europe-pages.js";
import { extractJobPostings } from "../../src/sources/jsonld.js";
const now = () => new Date("2026-09-30T00:00:00Z");
const hit = {id:"1",headline:"Industrirörmontör",webpage_url:"https://arbetsformedlingen.se/platsbanken/annonser/1",description:{text:"Industrial piping"},employer:{name:"Test AB"},workplace_address:{country_code:"SE",city:"Malmö"}};
describe("European sources", () => {
  it("imports and deduplicates JobTech results without inventing commercial terms", async () => {
    const fetcher=vi.fn<typeof fetch>(async () => new Response(JSON.stringify({hits:[hit],total:{value:1}})));
    const result=await createJobtechAdapter().scan({fetcher,now});
    expect(result.status).toBe("success");expect(result.jobs).toHaveLength(1);
    expect(result.jobs[0]).toMatchObject({country:"SE",company:"Test AB"});expect(result.jobs[0]!.rate).toBeUndefined();
  });
  it("preserves an unknown country, rather than assuming all API jobs are Swedish", async () => {
    const fetcher=vi.fn<typeof fetch>(async () => new Response(JSON.stringify({hits:[{...hit,workplace_address:{}}],total:{value:1}})));
    expect((await createJobtechAdapter().scan({fetcher,now})).jobs[0]!.country).toBe("Nie podano");
  });
  it("ignores job locations outside Europe", async () => {
    const fetcher=vi.fn<typeof fetch>(async () => new Response(JSON.stringify({hits:[{...hit,workplace_address:{country_code:"US"}}],total:{value:1}})));
    expect((await createJobtechAdapter().scan({fetcher,now})).jobs).toEqual([]);
  });
  it("does not mark truncated pagination as a complete successful scan", async () => {
    const fetcher=vi.fn<typeof fetch>(async () => new Response(JSON.stringify({hits:[hit],total:{value:301}})));
    expect((await createJobtechAdapter().scan({fetcher,now,maxPages:1})).status).toBe("partial");
  });
  it("does not turn invalid API responses into successful empty scans", async () => {
    const fetcher=vi.fn<typeof fetch>(async () => new Response('{"message":"maintenance"}'));
    expect((await createJobtechAdapter().scan({fetcher,now})).status).toBe("failed");
  });
  it("honours a source blocking access", async () => {
    const fetcher=vi.fn<typeof fetch>(async () => new Response("Forbidden",{status:403}));
    expect(await createJobtechAdapter().scan({fetcher,now})).toMatchObject({status:"blocked",jobs:[]});
  });
  it("respects robots longest-match rules and allow on ties", () => {
    const robots="User-agent: *\nDisallow: /search\nAllow: /search/public\nDisallow: /private*";
    expect(robotsAllows(robots,"https://example.test/search?q=a")).toBe(false);
    expect(robotsAllows(robots,"https://example.test/search/public")).toBe(true);
    expect(robotsAllows(robots,"https://example.test/private/1")).toBe(false);
    expect(robotsAllows(robots,"https://example.test/job/1")).toBe(true);
  });
  it("never visits roots disallowed by robots", async () => {
    const fetcher=vi.fn<typeof fetch>(async () => new Response("User-agent: *\nDisallow: /"));
    expect(await createEuropeanPageAdapters()[0]!.scan({fetcher,now})).toMatchObject({status:"blocked",jobs:[]});
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("parses European JobPosting pay without turning monthly wages into hourly pay", () => {
    const data={'@type':'JobPosting',title:'Rohrschlosser',hiringOrganization:{name:'Test GmbH'},jobLocation:{address:{addressCountry:'DE',addressLocality:'Hamburg'}},baseSalary:{currency:'EUR',value:{value:4200,unitText:'MONTH'}}};
    const jobs=extractJobPostings('<script type="application/ld+json">'+JSON.stringify(data)+'</script>',"https://example.test/job/1");
    expect(jobs[0]).toMatchObject({rate:"4200 EUR/month",country:"DE"});
  });
  it("reports capped career-page discovery as partial and deduplicates links", async () => {
    const ad={'@type':'JobPosting',title:'Rohrschlosser',hiringOrganization:{name:'Test GmbH'},jobLocation:{address:{addressCountry:'DE'}}};
    const html='<script type="application/ld+json">'+JSON.stringify(ad)+'</script>';
    const fetcher=vi.fn<typeof fetch>(async input => new Response(String(input).endsWith('robots.txt')?'User-agent: *\nAllow: /':String(input).includes('/job/1')?html:'<a href="/job/1">Rohrschlosser</a>'));
    const result=await createEuropeanPageAdapters()[0]!.scan({fetcher,now});
    expect(result.status).toBe('partial');expect(result.jobs).toHaveLength(1);
    expect(fetcher).toHaveBeenCalledTimes(7);
  });
});
