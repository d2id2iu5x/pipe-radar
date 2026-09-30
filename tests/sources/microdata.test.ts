import { describe, expect, it } from 'vitest';
import { extractJobPostings } from '../../src/sources/jsonld.js';
describe('Employer microdata compatibility',()=>{
  const page='<div itemscope itemtype="http://schema.org/JobPosting"><h1 itemprop="title">Anlagenmechaniker / Rohrschlosser</h1><div itemprop="hiringOrganization" itemscope itemtype="https://schema.org/Organization"><span itemprop="name">Test GmbH</span></div><div itemprop="jobLocation" itemscope><div itemprop="address" itemscope><meta itemprop="addressCountry" content="DE"><span itemprop="addressLocality">Gersthofen</span></div></div><div itemprop="description">Industrielle Rohrleitungen und Isometrien.</div></div>';
  it('reads explicit JobPosting microdata instead of returning an empty imported list',()=>{
    expect(extractJobPostings(page,'https://jobs.example.test/job/1')).toEqual(expect.arrayContaining([expect.objectContaining({title:'Anlagenmechaniker / Rohrschlosser',country:'DE',location:'Gersthofen',company:'Test GmbH'})]));
  });
  it('never extracts referral bonuses or guesses remuneration from page text',()=>{
    const jobs=extractJobPostings(page+'<p>Referral bonus 1000 EUR</p>','https://jobs.example.test/job/1');
    expect(jobs).toHaveLength(1);expect(jobs[0]!.rate).toBeUndefined();
  });
});
