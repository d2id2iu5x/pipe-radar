import { load } from "cheerio";
import { inEuropeanScope } from "../domain/europe.js";
import { isRelevantJob } from "../domain/relevance.js";
import type { RawJob, SourceKind, SourceResult } from "../domain/types.js";
import { fetchSource } from "./http.js";
import { extractJobPostings } from "./jsonld.js";
import type { SourceAdapter } from "./types.js";

/** Conservative robots check. Unknown/unreadable policy stops the new adapter. */
export function robotsAllows(robots: string, url: string): boolean {
  const groups: { agents:string[]; rules:{allow:boolean; path:string}[] }[] = [];
  let group: typeof groups[number] | null = null;
  let hasDirective = false;
  for (const line of robots.split(/\r?\n/)) {
    const match = line.replace(/#.*/, "").trim().match(/^(user-agent|allow|disallow)\s*:\s*(.*)$/i);
    if (!match) continue;
    const directive = match[1]!.toLowerCase(), value = match[2]!.trim();
    if (directive === "user-agent") {
      if (!group || hasDirective) { group = {agents:[],rules:[]}; groups.push(group); hasDirective = false; }
      group.agents.push(value.toLowerCase());
    } else if (group) { hasDirective = true; if (value) group.rules.push({allow:directive === "allow",path:value}); }
  }
  const specific = groups.filter(g => g.agents.some(a => a !== "*" && "pipe radar".includes(a)));
  const chosen = specific.length ? specific : groups.filter(g => g.agents.includes("*"));
  const target = new URL(url); const path = target.pathname + target.search;
  const matches = chosen.flatMap(g => g.rules).filter(rule => {
    const end = rule.path.endsWith("$");
    const pattern = (end ? rule.path.slice(0,-1) : rule.path).split("*").map(part => part.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")).join(".*");
    return new RegExp("^" + pattern + (end ? "$" : "")).test(path);
  }).sort((a,b) => b.path.replace(/[*$]/g,"").length - a.path.replace(/[*$]/g,"").length || Number(b.allow) - Number(a.allow));
  return matches[0]?.allow ?? true;
}
const CONFIG: {id:string; kind:SourceKind; roots:string[]}[] = [
  {id:"bilfinger",kind:"employer",roots:["pipefitter","Rohrschlosser","pijpfitter","tuyauteur","industrirørlegger"].map(q => "https://jobs.bilfinger.com/search/?" + new URLSearchParams({q}))},
  {id:"silverhand",kind:"portal",roots:["https://silverhand.eu/oferty-pracy/", ...[2,3,4,5,6].map(page => `https://silverhand.eu/oferty-pracy/page/${page}/`)]}
];
export function createEuropeanPageAdapters(): SourceAdapter[] {
  return CONFIG.map(({id,kind,roots}) => ({id,kind,async scan(context) {
    const startedAt = context.now().toISOString();
    const jobs = new Map<string,RawJob>(); let requests = 0, succeeded = 0, failed = 0, blocked = false;
    const origin = new URL(roots[0]!).origin;
    const policy = await fetchSource({url:origin + "/robots.txt",fetcher:context.fetcher,timeoutMs:10000});
    requests += policy.attempts;
    if (policy.status !== "success" && policy.httpStatus !== 404) return {sourceId:id,sourceKind:kind,status:policy.status === "blocked" ? "blocked" : "failed",jobs:[],startedAt,finishedAt:context.now().toISOString(),http:{requests,succeeded,failed:1},diagnosticCode:"robots-unavailable"};
    const robots = policy.httpStatus === 404 ? "" : policy.body;
    const details = new Set<string>();
    const add = (html:string,url:string) => {
      const postings = extractJobPostings(html,url);
      for (const job of postings) if (isRelevantJob({title:job.title,description:job.description}) && inEuropeanScope(job.country)) {
        jobs.set(job.sourceJobId,{...job,sourceId:id,sourceKind:kind});
      }
    };
    for (const root of roots) {
      if (!robotsAllows(robots,root)) { blocked = true; failed++; continue; }
      const response = await fetchSource({url:root,fetcher:context.fetcher,timeoutMs:10000});requests += response.attempts;
      if (response.status !== "success") { blocked ||= response.status === "blocked"; failed++; continue; }
      succeeded++; add(response.body,root);
      const $ = load(response.body);
      $("a[href]").each((_,el) => {
        const title = $(el).text().trim();
        if (!isRelevantJob({title,description:title})) return;
        try { const url = new URL($(el).attr("href") || "",root);url.hash="";
          if (url.origin === origin && url.protocol === "https:" && robotsAllows(robots,url.href)) details.add(url.href);
        } catch { /* ignore malformed links */ }
      });
    }
    for (const url of [...details].slice(0,30)) {
      const response = await fetchSource({url,fetcher:context.fetcher,timeoutMs:10000});requests += response.attempts;
      if (response.status !== "success") { blocked ||= response.status === "blocked"; failed++; continue; }
      succeeded++; add(response.body,url);
    }
    // Bounded discovery is never exhaustive: absence must not archive an old ad.
    const status:SourceResult["status"] = succeeded ? "partial" : blocked ? "blocked" : "failed";
    return {sourceId:id,sourceKind:kind,status,jobs:[...jobs.values()],startedAt,finishedAt:context.now().toISOString(),http:{requests,succeeded,failed},diagnosticCode:blocked?"robots-or-access-blocked":"bounded-european-discovery"};
  }}));
}
