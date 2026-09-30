import { inEuropeanScope } from "../domain/europe.js";
import { isRelevantJob } from "../domain/relevance.js";
import type { RawJob, SourceResult } from "../domain/types.js";
import { fetchSource } from "./http.js";
import type { SourceAdapter } from "./types.js";

type Row = Record<string, unknown>;
const object = (v: unknown): Row => v && typeof v === "object" && !Array.isArray(v) ? v as Row : {};
const text = (v: unknown): string => typeof v === "string" ? v.trim() : "";
export function createJobtechAdapter(): SourceAdapter {
  return { id: "jobtech", kind: "official-api", async scan(context) {
    const startedAt = context.now().toISOString();
    const jobs = new Map<string, RawJob>();
    let requests = 0, succeeded = 0, failed = 0, blocked = false, complete = true;
    const queries = ["industrirörmontör", "rörmontör", "pipefitter"];
    const maxPages = Math.max(1, Math.min(context.maxPages ?? 3, 5));
    for (const q of queries) {
      for (let page = 0; page < maxPages; page++) {
        const url = "https://jobsearch.api.jobtechdev.se/search?" + new URLSearchParams({q, limit:"100", offset:String(page * 100)});
        const response = await fetchSource({url, fetcher:context.fetcher, timeoutMs:10000, headers:{Accept:"application/json"}});
        requests += response.attempts;
        if (response.status !== "success") { failed++; blocked ||= response.status === "blocked"; complete = false; break; }
        let data: Row;
        try { data = object(JSON.parse(response.body)); } catch { failed++; complete = false; break; }
        if (!Array.isArray(data.hits)) { failed++; complete = false; break; }
        succeeded++;
        for (const item of data.hits) {
          const hit = object(item), description = object(hit.description), address = object(hit.workplace_address), employer = object(hit.employer);
          const title = text(hit.headline), id = text(hit.id);
          // JobTech uses internal numeric codes (e.g. 199), not ISO codes.
          // Prefer the explicit workplace country; never infer it from the API's origin.
          const code = text(address.country_code);
          const country = text(address.country) || (/^[A-Za-z]{2}$/.test(code) ? code : "Nie podano");
          if (!id || !isRelevantJob({title, description:text(description.text)}) || !inEuropeanScope(country)) continue;
          const rawUrl = text(hit.webpage_url) || `https://arbetsformedlingen.se/platsbanken/annonser/${encodeURIComponent(id)}`;
          let publicUrl: URL;
          try { publicUrl = new URL(rawUrl); } catch { continue; }
          if (publicUrl.protocol !== "https:") continue;
          jobs.set(id, { sourceId:"jobtech", sourceJobId:id, sourceKind:"official-api", url:publicUrl.href,
            title, company:text(employer.name) || "Nie podano", country,
            location:text(address.city) || text(address.municipality) || text(address.region) || undefined,
            description:text(description.text), employmentType:text(object(hit.employment_type).label) || undefined,
            publishedAt:text(hit.publication_date) || undefined, rate:text(hit.salary_description) || undefined });
        }
        const total = object(data.total).value;
        if (typeof total !== "number" || !Number.isFinite(total) || total < 0) { complete = false; break; }
        if ((page + 1) * 100 >= total) break;
        if (data.hits.length === 0 || page + 1 === maxPages) { complete = false; break; }
      }
    }
    const status: SourceResult["status"] = succeeded === 0 ? (blocked ? "blocked" : "failed") : complete && failed === 0 ? "success" : "partial";
    return { sourceId:"jobtech", sourceKind:"official-api", status, jobs:[...jobs.values()], startedAt, finishedAt:context.now().toISOString(),
      http:{requests,succeeded,failed}, ...(status === "success" ? {} : {diagnosticCode:blocked ? "access-blocked" : "jobtech-incomplete"}) };
  }};
}
