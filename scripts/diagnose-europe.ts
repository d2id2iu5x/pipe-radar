/** Read-only diagnostics: no credentials, production writes or access-block bypasses. */
import { mkdir, writeFile } from 'node:fs/promises';
import { load } from 'cheerio';
import { fetchSource } from '../src/sources/http.js';
import { robotsAllows } from '../src/sources/europe-pages.js';
import { extractJobPostings } from '../src/sources/jsonld.js';
import { isRelevantJob } from '../src/domain/relevance.js';
const out: unknown[]=[];
for(const q of ['pipefitter','rörmontör','rör']) {
 const r=await fetchSource({url:'https://jobsearch.api.jobtechdev.se/search?'+new URLSearchParams({q,limit:'5'}),timeoutMs:10000,headers:{Accept:'application/json'}});
 try {const j=JSON.parse(r.body);out.push({query:q,status:r.status,total:j.total,keys:Object.keys(j),hitsCount:j.hits?.length,hits:j.hits?.map((h:Record<string,any>)=>({id:h.id,title:h.headline,address:h.workplace_address,relevant:isRelevantJob({title:h.headline||'',description:h.description?.text||''})}))});}
 catch {out.push({query:q,status:r.status,code:r.httpStatus});}
}
const origin='https://jobs.bilfinger.com';
const policy=await fetchSource({url:origin+'/robots.txt',timeoutMs:10000});
if(policy.status==='success') for(const url of [origin+'/search/?q=Rohrschlosser',origin+'/job/Gersthofen-Anlagenmechaniker-Rohrschlosser-(mwd)-BY-86368/1193218701/']) {
 if(!robotsAllows(policy.body,url)){out.push({url,blockedByRobots:true});continue;}
 const r=await fetchSource({url,timeoutMs:10000});const $=load(r.body);
 out.push({url,status:r.status,jobPostings:extractJobPostings(r.body,url).map(j=>({title:j.title,country:j.country,relevant:isRelevantJob(j)})),scopes:$('[itemscope]').map((_,el)=>$(el).attr('itemtype')).get(),properties:$('[itemprop]').map((_,el)=>({name:$(el).attr('itemprop'),text:($(el).attr('content')||$(el).text()).trim().slice(0,180)})).get().filter(el=>/^(title|addressCountry|addressLocality|addressRegion|name)$/.test(el.name||'')),scriptTypes:$('script[type]').map((_,el)=>$(el).attr('type')).get(),links:$('a[href]').map((_,el)=>({title:$(el).text().trim().slice(0,140),url:$(el).attr('href')})).get().filter(el=>isRelevantJob({title:el.title})).slice(0,12)});
}
await mkdir('review',{recursive:true});await writeFile('review/europe-diagnostics.json',JSON.stringify(out,null,2));console.log(JSON.stringify(out,null,2));
