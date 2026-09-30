import { describe, expect, it, vi } from 'vitest';
import { createJobtechAdapter } from '../../src/sources/jobtech.js';
import { normalizeJob } from '../../src/domain/normalize.js';
const now=()=>new Date('2026-09-30T00:00:00Z');
async function scan(address: Record<string,unknown>) {
 const hit={id:'1',headline:'Rörmontör',description:{text:'Industrial piping'},employer:{name:'Test AB'},workplace_address:address};
 const fetcher=vi.fn<typeof fetch>(async()=>new Response(JSON.stringify({hits:[hit],total:{value:1}})));
 return (await createJobtechAdapter().scan({fetcher,now})).jobs;
}
describe('JobTech actual country format',()=>{
 it('prefers explicit Sverige over the internal 199 country code',async()=>{
  const jobs=await scan({country_code:'199',country:'Sverige'});
  expect(jobs).toHaveLength(1);expect(normalizeJob(jobs[0]!,now().toISOString()).country).toBe('Szwecja');
 });
 it('does not infer Sweden from a numeric code alone',async()=>{
  expect((await scan({country_code:'199'}))[0]!.country).toBe('Nie podano');
 });
 it('still excludes explicitly non-European workplaces',async()=>{
  expect(await scan({country_code:'999',country:'United States'})).toHaveLength(0);
 });
});
