import { load } from "cheerio";
import type { RawJob, SourceKind, SourceResult } from "../domain/types.js";
import { isRelevantJob } from "../domain/relevance.js";
import { fetchSource } from "./http.js";
import { extractJobPostings } from "./jsonld.js";
import { SOURCE_CONFIG } from "./source-config.js";
import type { SourceAdapter } from "./types.js";

type ConfiguredId = Exclude<keyof typeof SOURCE_CONFIG, "finn">;
const KINDS: Record<ConfiguredId, SourceKind> = {
  adecco: "employer", simona: "employer", soprana: "employer",
  mojaNorwegia: "portal", vaia: "aggregator"
};

function adapter(id: ConfiguredId, roots: readonly string[]): SourceAdapter {
  const kind = KINDS[id];
  return {
    id,
    kind,
    async scan(context) {
      const startedAt = context.now().toISOString();
      const jobs: RawJob[] = [];
      let requests = 0;
      let succeeded = 0;
      let failed = 0;
      let blocked = false;
      let parsedEvidence = false;
      for (const root of roots) {
        const index = await fetchSource({ url: root, fetcher: context.fetcher, timeoutMs: 10_000 });
        requests += index.attempts;
        if (index.status !== "success") { failed += 1; blocked ||= index.status === "blocked"; continue; }
        succeeded += 1;
        const discovered = new Set<string>();
        const $ = load(index.body);
        $("a[href]").each((_, element) => {
          const title = $(element).text().trim();
          if (!isRelevantJob({ title, description: title })) return;
          try {
            const url = new URL($(element).attr("href") ?? "", root);
            if (url.origin === new URL(root).origin) discovered.add(url.href);
          } catch { /* ignore malformed links */ }
        });
        parsedEvidence ||= discovered.size > 0 || extractJobPostings(index.body, root).length > 0;
        for (const url of [...discovered].slice(0, 20)) {
          const detail = await fetchSource({ url, fetcher: context.fetcher, timeoutMs: 10_000 });
          requests += detail.attempts;
          if (detail.status !== "success") { failed += 1; blocked ||= detail.status === "blocked"; continue; }
          succeeded += 1;
          jobs.push(...extractJobPostings(detail.body, url)
            .filter(job => isRelevantJob({ title: job.title, description: job.description }))
            .map(job => ({ ...job, sourceId: id, sourceKind: kind })));
          parsedEvidence ||= extractJobPostings(detail.body, url).length > 0;
        }
      }
      const status: SourceResult["status"] = succeeded === 0 ? (blocked ? "blocked" : "failed") : failed > 0 || !parsedEvidence ? "partial" : "success";
      return {
        sourceId: id, sourceKind: kind, status, jobs, startedAt,
        finishedAt: context.now().toISOString(), http: { requests, succeeded, failed },
        ...(status !== "success" ? { diagnosticCode: blocked ? "access-blocked" : "configured-page-partial" } : {})
      };
    }
  };
}

export function createConfiguredPageAdapters(): SourceAdapter[] {
  return (Object.entries(SOURCE_CONFIG) as [keyof typeof SOURCE_CONFIG, readonly string[]][])
    .filter((entry): entry is [ConfiguredId, readonly string[]] => entry[0] !== "finn")
    .map(([id, roots]) => adapter(id, roots));
}
