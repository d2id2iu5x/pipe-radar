import { load } from "cheerio";
import type { RawJob, SourceResult } from "../domain/types.js";
import { isRelevantJob } from "../domain/relevance.js";
import { fetchSource } from "./http.js";
import { extractJobPostings } from "./jsonld.js";
import { SOURCE_CONFIG } from "./source-config.js";
import type { SourceAdapter } from "./types.js";

export function createFinnAdapter(): SourceAdapter {
  return {
    id: "finn",
    kind: "portal",
    async scan(context) {
      const startedAt = context.now().toISOString();
      const links = new Set<string>();
      const jobs: RawJob[] = [];
      let requests = 0;
      let succeeded = 0;
      let failed = 0;
      let blocked = false;
      for (const searchUrl of SOURCE_CONFIG.finn) {
        const response = await fetchSource({ url: searchUrl, fetcher: context.fetcher, timeoutMs: 10_000 });
        requests += response.attempts;
        if (response.status !== "success") { failed += 1; blocked ||= response.status === "blocked"; continue; }
        succeeded += 1;
        const $ = load(response.body);
        $("a[href]").each((_, element) => {
          const title = $(element).text().trim();
          if (!isRelevantJob({ title, description: title })) return;
          try {
            const url = new URL($(element).attr("href") ?? "", searchUrl);
            if (url.hostname === "www.finn.no" && /^\/job\/ad\/\d+$/.test(url.pathname)) links.add(`${url.origin}${url.pathname}`);
          } catch { /* ignore invalid discovery links */ }
        });
      }
      for (const url of [...links].slice(0, 25)) {
        const response = await fetchSource({ url, fetcher: context.fetcher, timeoutMs: 10_000 });
        requests += response.attempts;
        if (response.status !== "success") { failed += 1; blocked ||= response.status === "blocked"; continue; }
        succeeded += 1;
        const parsed = extractJobPostings(response.body, url)
          .filter(job => isRelevantJob({ title: job.title, description: job.description }))
          .map(job => ({ ...job, sourceId: "finn", sourceKind: "portal" as const }));
        jobs.push(...parsed);
      }
      const status: SourceResult["status"] = succeeded === 0 ? (blocked ? "blocked" : "failed") : failed > 0 || links.size === 0 ? "partial" : "success";
      return {
        sourceId: "finn", sourceKind: "portal", status, jobs, startedAt,
        finishedAt: context.now().toISOString(), http: { requests, succeeded, failed },
        ...(status !== "success" ? { diagnosticCode: blocked ? "access-blocked" : "finn-partial" } : {})
      };
    }
  };
}
