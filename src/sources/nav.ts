import type { RawJob, SourceResult } from "../domain/types.js";
import { isRelevantJob } from "../domain/relevance.js";
import { fetchSource } from "./http.js";
import type { SourceAdapter, SourceContext } from "./types.js";

const FEED_URL = "https://pam-stilling-feed.nav.no/api/v1/feed";

interface FeedEntry {
  uuid?: string;
  status?: string;
  title?: string;
  url?: string;
}

interface FeedPage { content?: FeedEntry[]; next_url?: string | null }

function iso(context: SourceContext): string { return context.now().toISOString(); }

function empty(context: SourceContext, startedAt: string, diagnosticCode: string): SourceResult {
  return { sourceId: "nav", sourceKind: "official-api", status: "blocked", jobs: [], inactiveIds: [], startedAt, finishedAt: iso(context), diagnosticCode, http: { requests: 0, succeeded: 0, failed: 0 } };
}

function rawJob(detail: Record<string, unknown>, entry: FeedEntry): RawJob | null {
  const uuid = String(detail.uuid ?? entry.uuid ?? "");
  const title = String(detail.title ?? entry.title ?? "");
  if (!uuid || !title) return null;
  const location = detail.location && typeof detail.location === "object" ? detail.location as Record<string, unknown> : {};
  const description = String(detail.description ?? "");
  if (!isRelevantJob({ title, description })) return null;
  return {
    sourceId: "nav",
    sourceJobId: uuid,
    sourceKind: "official-api",
    url: `https://arbeidsplassen.nav.no/stillinger/stilling/${uuid}`,
    title,
    company: String(detail.businessName ?? "Nie podano"),
    country: String(location.country ?? "Norway"),
    location: String(location.city ?? location.municipal ?? "Nie podano"),
    description,
    publishedAt: typeof detail.published === "string" ? detail.published : undefined
  };
}

export function createNavAdapter(): SourceAdapter {
  return {
    id: "nav",
    kind: "official-api",
    async scan(context) {
      const startedAt = iso(context);
      const token = context.env?.NAV_FEED_TOKEN;
      if (!token) return empty(context, startedAt, "missing-nav-token");
      const jobs: RawJob[] = [];
      const inactiveIds: string[] = [];
      let requests = 0;
      let succeeded = 0;
      let failed = 0;
      let pageUrl = new URL(context.cursor?.nextUrl ?? FEED_URL, FEED_URL).href;
      let nextUrl = "";
      let etag = context.cursor?.etag ?? "";
      let lastModified = context.cursor?.lastModified ?? "";
      const maxPages = Math.max(1, context.maxPages ?? 5);
      let status: SourceResult["status"] = "success";

      for (let page = 0; page < maxPages && pageUrl; page += 1) {
        const headers = new Headers({ Authorization: `Bearer ${token}`, Accept: "application/json" });
        if (page === 0 && etag) headers.set("If-None-Match", etag);
        if (page === 0 && lastModified) headers.set("If-Modified-Since", lastModified);
        const response = await fetchSource({ url: pageUrl, fetcher: context.fetcher, timeoutMs: 10_000, headers });
        requests += response.attempts;
        if (response.httpStatus === 304) { succeeded += 1; break; }
        if (response.status !== "success") {
          failed += 1;
          status = response.status;
          break;
        }
        succeeded += 1;
        etag = response.headers.get("etag") ?? etag;
        lastModified = response.headers.get("last-modified") ?? lastModified;
        let feed: FeedPage;
        try { feed = JSON.parse(response.body) as FeedPage; } catch { failed += 1; status = "failed"; break; }
        nextUrl = typeof feed.next_url === "string" ? feed.next_url : "";
        for (const entry of feed.content ?? []) {
          if (!entry.uuid) continue;
          if (entry.status !== "ACTIVE") {
            inactiveIds.push(`nav:${entry.uuid}`);
            continue;
          }
          if (!isRelevantJob({ title: entry.title ?? "", description: "" })) continue;
          const detailUrl = entry.url ?? `https://pam-stilling-feed.nav.no/api/v1/ads/${entry.uuid}`;
          const detailResponse = await fetchSource({ url: detailUrl, fetcher: context.fetcher, timeoutMs: 10_000, headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } });
          requests += detailResponse.attempts;
          if (detailResponse.status !== "success") { failed += 1; status = "partial"; continue; }
          succeeded += 1;
          try {
            const parsed = JSON.parse(detailResponse.body) as Record<string, unknown>;
            const job = rawJob(parsed, entry);
            if (job) jobs.push(job);
          } catch { failed += 1; status = "partial"; }
        }
        pageUrl = nextUrl ? new URL(nextUrl, FEED_URL).href : "";
      }

      if (status === "success" && nextUrl) status = "partial";

      return {
        sourceId: "nav", sourceKind: "official-api", status, jobs, inactiveIds,
        startedAt, finishedAt: iso(context), http: { requests, succeeded, failed },
        cursor: { ...(nextUrl ? { nextUrl } : {}), ...(etag ? { etag } : {}), ...(lastModified ? { lastModified } : {}) },
        ...(status !== "success" ? { diagnosticCode: status === "blocked" ? "access-blocked" : "nav-feed-failed" } : {})
      };
    }
  };
}
