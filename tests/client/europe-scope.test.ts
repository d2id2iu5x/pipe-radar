import { expect, it } from 'vitest';
import { loadJobs } from '../../src/client/remote-data.js';
const job=(id:string,country:string)=>({id,country,title:'Pipefitter',url:'https://example.test/job/'+id,sources:[{url:'https://example.test/job/'+id}]});
const payload={schemaVersion:'2.4',status:'partial',sources:[],jobs:[job('us','US'),job('de','DE'),job('unknown','Nie podano')]};
it('excludes non-European records from the Europe UI without guessing their country',async()=>{
 const result=await loadJobs({fetcher:async()=>new Response(JSON.stringify(payload)),fallback:[]});
 expect(result.jobs.map((j:{id:string})=>j.id)).toEqual(['de','unknown']);
});
it('normalizes country aliases from older saved snapshots',async()=>{
 const result=await loadJobs({fetcher:async()=>new Response(JSON.stringify(payload)),fallback:[]});
 expect(result.jobs[0].country).toBe('Niemcy');expect(payload.jobs[1]!.country).toBe('DE');
});
