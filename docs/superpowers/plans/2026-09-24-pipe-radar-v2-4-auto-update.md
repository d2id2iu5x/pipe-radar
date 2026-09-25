# PIPE RADAR v2.4 Auto-Update Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Netlify-hosted PIPE RADAR that scans supported job sources every six hours, publishes a validated snapshot without redeploying the page, and preserves the last good data when sources fail.

**Architecture:** A scheduled Netlify Function starts a background scanner. Independent source adapters emit a shared domain model; normalization, deduplication, FIT scoring, lifecycle rules, and snapshot validation run before site-scoped Netlify Blobs is updated. A read-only API serves the last valid snapshot, while the existing static page keeps its embedded v2.3.1 dataset as an offline fallback.

**Tech Stack:** TypeScript 5, Node.js 22, Netlify Functions, `@netlify/blobs`, Cheerio, Vitest, jsdom, vanilla HTML/CSS/JavaScript.

**Spec:** `docs/superpowers/specs/2026-09-24-pipe-radar-v2-4-auto-update-design.md`

## Global Constraints

- Run the production scan with cron `0 */6 * * *`.
- Do not bypass CAPTCHA, authentication gates, robots protections, or anti-bot responses.
- Treat unavailable sources as `blocked` or `failed`; never fabricate jobs or missing fields.
- Keep the embedded v2.3.1 jobs as the browser fallback.
- Preserve the existing `pipe-radar-profile-v2` and `pipe-radar-saved-v2` localStorage contracts.
- A source marked `INACTIVE`, `EXPIRED`, `DELETED`, or explicitly expired leaves active public results immediately.
- For sources without explicit status, archive only after absence from three consecutive successful scans of that source.
- NAV inactive content must not remain in public results; retain only identifiers and lifecycle audit metadata.
- Never expose tokens, parser diagnostics, contact details from inactive NAV ads, or internal scan reports through `/api/jobs`.
- Publish to production only after a successful Netlify preview verification.

## Review Focus

- All sources time out: keep the previous snapshot and expose `fallback`, covered by Task 7 integration tests.
- NAV sends `INACTIVE`: remove public ad data immediately and retain only audit metadata, covered by Task 5 tests.
- Two sources disagree about one job: use source precedence and mark unresolved conflicts, covered by Task 3 tests.
- A portal omits salary, rotation, housing, or travel: preserve `Nie podano`, covered by Task 2 tests.
- Existing browser storage is corrupt or concurrently modified: do not overwrite it during remote-data boot, covered by Task 9 jsdom tests.

---

## File Map

### Project and configuration

- `package.json` — scripts, runtime dependencies, Node version, and test tooling.
- `package-lock.json` — reproducible dependency graph.
- `tsconfig.json` — strict TypeScript configuration for domain code and functions.
- `vitest.config.ts` — Node and jsdom test projects.
- `netlify.toml` — static publish directory, function directory, bundler, schedule, and security headers.
- `.gitignore` — dependencies, coverage, local Netlify state, and environment files.

### Domain

- `src/domain/types.ts` — shared `Job`, `SourceResult`, `Snapshot`, and lifecycle types.
- `src/domain/validate.ts` — runtime validation and safe public projection.
- `src/domain/normalize.ts` — text, dates, URLs, rate, rotation, benefits, and job normalization.
- `src/domain/relevance.ts` — configurable multilingual pipefitter relevance rules.
- `src/domain/dedupe.ts` — stable identity, source precedence, merge, and conflict marking.
- `src/domain/lifecycle.ts` — new/active/uncertain/archive transitions and NAV redaction.
- `src/domain/fit.ts` — documented FIT calculation over normalized jobs.
- `src/domain/snapshot.ts` — scan aggregation, snapshot validation, and public status calculation.

### Sources

- `src/sources/types.ts` — adapter interface and request context.
- `src/sources/http.ts` — timeout, one retry, response classification, and safe fetch headers.
- `src/sources/jsonld.ts` — reusable `JobPosting` JSON-LD extraction.
- `src/sources/nav.ts` — NAV Job Vacancy Feed consumer.
- `src/sources/finn.ts` — FINN search-page discovery and job-detail parsing.
- `src/sources/configured-pages.ts` — compliant configured career/portal page discovery.
- `src/sources/registry.ts` — explicit list of enabled, blocked, and unavailable sources.
- `src/sources/source-config.ts` — immutable search URLs, source kinds, and precedence.

### Storage and scan orchestration

- `src/scan/run-scan.ts` — adapter orchestration and pipeline.
- `src/storage/blob-store.ts` — atomic latest/previous snapshot and lifecycle persistence.
- `netlify/functions/scan-schedule.ts` — six-hour scheduler that starts background work.
- `netlify/functions/scan-background.ts` — protected background scan endpoint.
- `netlify/functions/jobs.ts` — read-only public snapshot endpoint.

### Client

- `data/seed-jobs.json` — preserved v2.3.1 fallback records.
- `src/client/remote-data.js` — remote loading, schema guard, timeout, and fallback decision.
- `src/client/status-view.js` — four user-facing freshness states and source health panel.
- `index.html` — existing application, changed only to consume dynamic jobs and show status.

### Tests and fixtures

- `tests/domain/*.test.ts` — domain behavior.
- `tests/sources/*.test.ts` — adapter contracts.
- `tests/scan/run-scan.test.ts` — pipeline integration.
- `tests/storage/blob-store.test.ts` — storage atomicity.
- `tests/functions/*.test.ts` — function response and authorization behavior.
- `tests/client/*.test.ts` — remote boot and localStorage regression tests.
- `tests/fixtures/**` — saved minimal responses for deterministic parser tests.

---

### Task 1: Establish the Testable Project Baseline

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `netlify.toml`
- Create: `.gitignore`
- Create: `data/seed-jobs.json`
- Create: `tests/baseline/seed-jobs.test.ts`
- Modify: `index.html:289-326`

**Interfaces:**
- Consumes: the exact 13 v2.3.1 `JOBS` entries and `RECORD_META` mapping from `index.html`.
- Produces: `data/seed-jobs.json` with stable IDs and metadata; commands `npm test`, `npm run typecheck`, and `npm run check`.

- [ ] **Step 1: Add the failing seed preservation test**

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("v2.3.1 seed", () => {
  it("preserves all 13 stable job ids", () => {
    const jobs = JSON.parse(readFileSync("data/seed-jobs.json", "utf8"));
    expect(jobs).toHaveLength(13);
    expect(new Set(jobs.map((job: { id: string }) => job.id)).size).toBe(13);
    expect(jobs.map((job: { id: string }) => job.id)).toContain("rempol-rotation");
  });
});
```

- [ ] **Step 2: Run the test and confirm the missing-file failure**

Run: `npm test -- tests/baseline/seed-jobs.test.ts`  
Expected: FAIL because `package.json` or `data/seed-jobs.json` does not exist.

- [ ] **Step 3: Add the project configuration**

Create `package.json` with:

```json
{
  "name": "pipe-radar",
  "version": "2.4.0",
  "private": true,
  "type": "module",
  "engines": { "node": "22.x" },
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit",
    "check": "npm run typecheck && npm test"
  },
  "dependencies": {
    "@netlify/blobs": "^11.1.0",
    "@netlify/functions": "^6.0.0",
    "cheerio": "^1.2.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "jsdom": "^30.1.1",
    "typescript": "^7.0.2",
    "vitest": "^5.0.1"
  }
}
```

Create strict `tsconfig.json` targeting ES2023 with `module` and `moduleResolution` set to `NodeNext`, `noUncheckedIndexedAccess: true`, and includes for `src`, `netlify/functions`, `tests`, and `vitest.config.ts`.

Create `vitest.config.ts` with Node as the default environment and `tests/client/**` matched to jsdom.

Create `netlify.toml`:

```toml
[build]
  publish = "."

[functions]
  directory = "netlify/functions"
  node_bundler = "esbuild"

[[headers]]
  for = "/*"
  [headers.values]
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
```

- [ ] **Step 4: Extract the exact current records into the fallback file**

Move the v2.3.1 job records plus resolved `id` and `meta` values into `data/seed-jobs.json`. Replace the giant inline `JOBS` literal with a small fallback loader only after Task 9 adds remote boot; until then keep behavior unchanged by embedding the same JSON through a generated inline assignment.

- [ ] **Step 5: Install dependencies and run baseline checks**

Run: `npm install`  
Run: `npm run check`  
Expected: seed test PASS and TypeScript PASS.

- [ ] **Step 6: Commit the baseline**

```bash
git add package.json package-lock.json tsconfig.json vitest.config.ts netlify.toml .gitignore data/seed-jobs.json tests/baseline/seed-jobs.test.ts index.html
git commit -m "chore: establish PIPE RADAR v2.4 test baseline"
```

---

### Task 2: Define and Normalize the Job Contract

**Files:**
- Create: `src/domain/types.ts`
- Create: `src/domain/validate.ts`
- Create: `src/domain/normalize.ts`
- Create: `src/domain/relevance.ts`
- Create: `src/domain/fit.ts`
- Create: `tests/domain/normalize.test.ts`
- Create: `tests/domain/validate.test.ts`
- Create: `tests/domain/fit.test.ts`

**Interfaces:**
- Consumes: raw adapter records shaped as `RawJob`.
- Produces: `normalizeJob(raw: RawJob, seenAt: string): Job`, `validateSnapshot(value: unknown): Snapshot`, `toPublicSnapshot(snapshot: Snapshot): PublicSnapshot`, `calculateFit(job: Job): FitBreakdown`.

- [ ] **Step 1: Write failing normalization and missing-data tests**

```ts
it("does not invent missing commercial terms", () => {
  const job = normalizeJob({
    sourceId: "example", sourceJobId: "42", sourceKind: "portal",
    url: "https://example.test/jobs/42", title: "Pipefitter",
    company: "Example AS", country: "Norway"
  }, "2026-09-24T12:00:00.000Z");
  expect(job.rate.raw).toBe("Nie podano");
  expect(job.rotation.raw).toBe("Nie podano");
  expect(job.housing.raw).toBe("Nie podano");
  expect(job.travel.raw).toBe("Nie podano");
});

it("parses a guaranteed lower hourly rate without treating diet as base pay", () => {
  expect(normalizeRate("300 NOK/h + 200 NOK dieta/dzień")).toEqual({
    raw: "300 NOK/h + 200 NOK dieta/dzień", currency: "NOK",
    hourlyMin: 300, hourlyMax: 300, approximate: false
  });
});
```

- [ ] **Step 2: Run the domain tests and confirm missing-module failures**

Run: `npm test -- tests/domain/normalize.test.ts tests/domain/validate.test.ts tests/domain/fit.test.ts`  
Expected: FAIL because the domain modules do not exist.

- [ ] **Step 3: Implement exact types and normalizers**

Define literal unions:

```ts
export type SourceKind = "employer" | "official-api" | "portal" | "aggregator";
export type SourceRunStatus = "success" | "partial" | "blocked" | "failed";
export type JobStatus = "new" | "active" | "uncertain" | "archived";
export type SnapshotStatus = "fresh" | "partial" | "fallback";
```

Implement `Job` with stable identity, source list, normalized terms, timestamps, lifecycle counters, FIT breakdown, and conflict flags. Use `null` only for machine-readable missing values; use `Nie podano` in the public raw display fields.

- [ ] **Step 4: Implement runtime validation and public projection**

`validateSnapshot` must reject non-objects, duplicate job IDs, invalid URLs, missing scan metadata, missing source references, invalid ISO timestamps, and unsupported schema versions. `toPublicSnapshot` must omit internal parser messages, tokens, raw contact data, and lifecycle storage internals.

- [ ] **Step 5: Implement relevance and FIT**

Store multilingual terms in immutable arrays. `isRelevantJob` must require at least one pipe-trade title term and reject unrelated domestic plumbing matches unless industrial/maritime context is also present. Port the documented v2.3.1 FIT adjustments into pure TypeScript and preserve the 0–100 clamp.

- [ ] **Step 6: Run tests and commit**

Run: `npm run check`  
Expected: all domain tests PASS.

```bash
git add src/domain tests/domain
git commit -m "feat: add normalized job domain contract"
```

---

### Task 3: Implement Dedupe and Lifecycle Rules

**Files:**
- Create: `src/domain/dedupe.ts`
- Create: `src/domain/lifecycle.ts`
- Create: `tests/domain/dedupe.test.ts`
- Create: `tests/domain/lifecycle.test.ts`

**Interfaces:**
- Consumes: normalized `Job[]`, prior `LifecycleState`, and successful source IDs.
- Produces: `mergeJobs(jobs: Job[]): Job[]`, `applyLifecycle(input: LifecycleInput): LifecycleResult`, `redactInactiveNav(job: Job): LifecycleAuditRecord`.

- [ ] **Step 1: Write failing source-precedence and conflict tests**

```ts
it("prefers employer data but retains every source URL", () => {
  const merged = mergeJobs([portalCopy, employerCopy]);
  expect(merged).toHaveLength(1);
  expect(merged[0].company).toBe(employerCopy.company);
  expect(merged[0].sources.map(source => source.url)).toEqual(
    expect.arrayContaining([portalCopy.url, employerCopy.url])
  );
});

it("marks unresolved commercial conflicts", () => {
  const [job] = mergeJobs([portalWith280, employerWith300]);
  expect(job.conflicts).toContain("rate");
});
```

- [ ] **Step 2: Write failing lifecycle tests**

```ts
it("archives only after three successful absences", () => {
  const state1 = applyLifecycle(missingOnce);
  const state2 = applyLifecycle({ ...missingTwice, previous: state1.state });
  const state3 = applyLifecycle({ ...missingThrice, previous: state2.state });
  expect(state1.jobs[0].status).toBe("active");
  expect(state2.jobs[0].status).toBe("uncertain");
  expect(state3.jobs[0].status).toBe("archived");
});

it("does not count a failed source as an absence", () => {
  expect(applyLifecycle(failedSourceInput).state.jobs["job-1"].missingSuccessfulScans).toBe(0);
});
```

- [ ] **Step 3: Run tests and confirm failures**

Run: `npm test -- tests/domain/dedupe.test.ts tests/domain/lifecycle.test.ts`  
Expected: FAIL because dedupe and lifecycle functions do not exist.

- [ ] **Step 4: Implement stable keys and merge precedence**

Use canonical source IDs first. Otherwise generate a deterministic SHA-256 key from normalized company, title, and location. Merge precedence is `employer > official-api > portal > aggregator`. Preserve conflicts rather than silently selecting contradictory commercial values.

- [ ] **Step 5: Implement explicit expiry and NAV redaction**

On an explicit inactive event, remove the public `Job` immediately. For NAV retain only:

```ts
export interface LifecycleAuditRecord {
  id: string;
  sourceId: string;
  sourceJobId: string;
  status: "archived";
  lastSeenAt: string;
  archivedAt: string;
  reason: "explicit-inactive" | "three-successful-absences";
}
```

Do not retain NAV title, description, employer, contact, application URL, or location in the public snapshot after `INACTIVE`.

- [ ] **Step 6: Run tests and commit**

Run: `npm run check`  
Expected: all dedupe and lifecycle tests PASS.

```bash
git add src/domain/dedupe.ts src/domain/lifecycle.ts tests/domain/dedupe.test.ts tests/domain/lifecycle.test.ts
git commit -m "feat: add dedupe and job lifecycle rules"
```

---

### Task 4: Build the Adapter Framework and Safe HTTP Layer

**Files:**
- Create: `src/sources/types.ts`
- Create: `src/sources/http.ts`
- Create: `src/sources/jsonld.ts`
- Create: `src/sources/source-config.ts`
- Create: `tests/sources/http.test.ts`
- Create: `tests/sources/jsonld.test.ts`
- Create: `tests/fixtures/jsonld/job-posting.html`

**Interfaces:**
- Consumes: `fetch`, source configuration, scan time, and optional environment tokens.
- Produces: `SourceAdapter.scan(context): Promise<SourceResult>`, `fetchSource(request): Promise<ClassifiedResponse>`, `extractJobPostings(html, pageUrl): RawJob[]`.

- [ ] **Step 1: Write failing timeout, retry, block, and JSON-LD tests**

```ts
it("retries one 503 and then succeeds", async () => {
  const fetcher = vi.fn()
    .mockResolvedValueOnce(new Response("busy", { status: 503 }))
    .mockResolvedValueOnce(new Response("ok"));
  const response = await fetchSource({ url: "https://example.test", fetcher, timeoutMs: 50 });
  expect(response.status).toBe("success");
  expect(fetcher).toHaveBeenCalledTimes(2);
});

it("classifies a CAPTCHA page as blocked without retry loops", async () => {
  const response = await fetchSource({
    url: "https://example.test",
    fetcher: async () => new Response("Verify you are human", { status: 403 }),
    timeoutMs: 50
  });
  expect(response.status).toBe("blocked");
});
```

- [ ] **Step 2: Run tests and confirm failures**

Run: `npm test -- tests/sources/http.test.ts tests/sources/jsonld.test.ts`  
Expected: FAIL because source framework files do not exist.

- [ ] **Step 3: Implement the adapter contract**

```ts
export interface SourceAdapter {
  readonly id: string;
  readonly kind: SourceKind;
  scan(context: SourceContext): Promise<SourceResult>;
}
```

`SourceResult` contains `sourceId`, `status`, `jobs`, `startedAt`, `finishedAt`, HTTP summary counts, and a non-public diagnostic code. It never contains secrets.

- [ ] **Step 4: Implement safe fetch behavior**

Use `AbortSignal.timeout(timeoutMs)`, an explicit `Accept` header, a transparent PIPE RADAR user agent, and one retry only for timeout, 429, 502, 503, or 504. Respect `Retry-After` only up to five seconds. Classify CAPTCHA text, login gates, and anti-bot pages as `blocked`.

- [ ] **Step 5: Implement JSON-LD extraction and immutable source config**

Parse only `application/ld+json` entries whose `@type` is `JobPosting`. Resolve relative URLs against the page URL. Configure exact discovery roots:

```ts
export const SOURCE_CONFIG = Object.freeze({
  finn: [
    "https://www.finn.no/job/search?q=industrir%C3%B8rlegger",
    "https://www.finn.no/job/search?q=pipefitter"
  ],
  adecco: ["https://www.adecco.com/nb-no/ledige-stillinger"],
  simona: ["https://www.simona-stadpipe.com/en/career/"],
  soprana: ["https://stillinger.soprana.no/"],
  mojaNorwegia: ["https://www.mojanorwegia.pl/ogloszenia_o_prace/"],
  vaia: ["https://talents.vaia.com/companies/moja-norwegia/"]
});
```

- [ ] **Step 6: Run tests and commit**

Run: `npm run check`  
Expected: adapter framework tests PASS.

```bash
git add src/sources tests/sources tests/fixtures/jsonld
git commit -m "feat: add safe source adapter framework"
```

---

### Task 5: Implement the NAV Job Vacancy Feed Adapter

**Files:**
- Create: `src/sources/nav.ts`
- Create: `tests/sources/nav.test.ts`
- Create: `tests/fixtures/nav/feed-active.json`
- Create: `tests/fixtures/nav/feed-inactive.json`
- Create: `tests/fixtures/nav/job-active.json`

**Interfaces:**
- Consumes: `NAV_FEED_TOKEN`, stored NAV cursor/ETag/Last-Modified values, and `https://pam-stilling-feed.nav.no/api/v1/feed`.
- Produces: `createNavAdapter(): SourceAdapter`, active normalized raw jobs, immediate inactive lifecycle events, and the next cursor state.

- [ ] **Step 1: Write failing active, cursor, and inactive tests**

```ts
it("follows next_url and fetches details only for relevant active entries", async () => {
  const result = await createNavAdapter().scan(navFixtureContext);
  expect(result.status).toBe("success");
  expect(result.jobs[0].sourceKind).toBe("official-api");
  expect(result.cursor?.nextUrl).toBe("/api/v1/feed/next-page");
});

it("emits immediate deletion without republishing inactive content", async () => {
  const result = await createNavAdapter().scan(navInactiveContext);
  expect(result.inactiveIds).toEqual(["nav:uuid-1"]);
  expect(JSON.stringify(result)).not.toContain("Old employer");
});
```

- [ ] **Step 2: Run tests and confirm failure**

Run: `npm test -- tests/sources/nav.test.ts`  
Expected: FAIL because `src/sources/nav.ts` does not exist.

- [ ] **Step 3: Implement authenticated incremental feed consumption**

Send `Authorization: Bearer ${token}`, `Accept: application/json`, and saved `If-None-Match`/`If-Modified-Since` headers. Follow `next_url` within a bounded page budget per scan. Filter relevance locally, because the feed does not provide server-side keyword filtering.

- [ ] **Step 4: Enforce NAV inactivity terms**

For `_feed_entry.status !== "ACTIVE"`, emit only the stable source ID in `inactiveIds`. Do not fetch or persist inactive detail content. When a previously active ID becomes inactive, Task 3 removes it from public results during the same successful scan.

- [ ] **Step 5: Handle missing production token honestly**

If `NAV_FEED_TOKEN` is unset, return `blocked` with diagnostic code `missing-nav-token`; do not fetch the rotating experiment token in production. Document the token request prerequisite in `README.md` during Task 11.

- [ ] **Step 6: Run tests and commit**

Run: `npm run check`  
Expected: NAV tests PASS.

```bash
git add src/sources/nav.ts tests/sources/nav.test.ts tests/fixtures/nav
git commit -m "feat: consume NAV job vacancy feed"
```

---

### Task 6: Implement FINN and Configured Page Adapters

**Files:**
- Create: `src/sources/finn.ts`
- Create: `src/sources/configured-pages.ts`
- Create: `src/sources/registry.ts`
- Create: `tests/sources/finn.test.ts`
- Create: `tests/sources/configured-pages.test.ts`
- Create: `tests/sources/registry.test.ts`
- Create: `tests/fixtures/finn/search.html`
- Create: `tests/fixtures/finn/job.html`
- Create: `tests/fixtures/pages/career-index.html`
- Create: `tests/fixtures/pages/job-detail.html`

**Interfaces:**
- Consumes: `SOURCE_CONFIG`, `fetchSource`, `extractJobPostings`, and relevance rules.
- Produces: `createFinnAdapter()`, `createConfiguredPageAdapters()`, and `getSourceRegistry()`.

- [ ] **Step 1: Write failing FINN discovery and pagination tests**

```ts
it("discovers canonical FINN job links and ignores navigation links", async () => {
  const result = await createFinnAdapter().scan(finnFixtureContext);
  expect(result.jobs.map(job => job.url)).toEqual([
    "https://www.finn.no/job/ad/462637858"
  ]);
});
```

- [ ] **Step 2: Write failing configured-page and block reporting tests**

```ts
it("extracts same-origin relevant detail links then parses JobPosting", async () => {
  const result = await createConfiguredPageAdapters()[0].scan(pageFixtureContext);
  expect(result.jobs[0].title).toMatch(/pipefitter/i);
});

it("keeps restricted sources visible as blocked instead of inventing jobs", async () => {
  const registry = getSourceRegistry({ includeRestricted: true });
  expect(registry.find(source => source.id === "indeed")?.mode).toBe("probe-only");
});
```

- [ ] **Step 3: Run tests and confirm failures**

Run: `npm test -- tests/sources/finn.test.ts tests/sources/configured-pages.test.ts tests/sources/registry.test.ts`  
Expected: FAIL because adapters do not exist.

- [ ] **Step 4: Implement FINN parsing**

Discover only canonical `/job/ad/<digits>` links from the configured FINN search pages. Limit detail fetches to relevant titles and a fixed per-scan maximum. Parse `JobPosting` JSON-LD first; use explicit semantic selectors only as a tested fallback.

- [ ] **Step 5: Implement configured page discovery**

For Adecco, Simona, Soprana, MojaNorwegia, Vaia, and public employer career pages, fetch only configured public index pages, follow same-origin job links whose visible title matches relevance terms, then parse JSON-LD/detail content. Jobs.pl and Poloniusz are registered with their existing known listing URLs from the seed plus public discovery roots only after a fixture proves a stable index contract.

- [ ] **Step 6: Register Indeed as transparent probe-only**

Indeed does not expose an open job-search API for this consumer use. Register it as `probe-only`: a compliant public response may be parsed only through stable structured data; CAPTCHA, login, 403, 429, or anti-bot content returns `blocked`. Never simulate a browser or rotate identities.

- [ ] **Step 7: Run tests and commit**

Run: `npm run check`  
Expected: all adapter tests PASS.

```bash
git add src/sources tests/sources tests/fixtures/finn tests/fixtures/pages
git commit -m "feat: add broad compliant source adapters"
```

---

### Task 7: Orchestrate Scans and Persist Atomic Snapshots

**Files:**
- Create: `src/domain/snapshot.ts`
- Create: `src/scan/run-scan.ts`
- Create: `src/storage/blob-store.ts`
- Create: `tests/scan/run-scan.test.ts`
- Create: `tests/storage/blob-store.test.ts`

**Interfaces:**
- Consumes: `SourceAdapter[]`, `SnapshotStore`, prior lifecycle state, and scan clock.
- Produces: `runScan(deps): Promise<ScanOutcome>`, `createBlobSnapshotStore(): SnapshotStore`, validated latest/previous snapshots and reports.

- [ ] **Step 1: Write failing full-pipeline and all-sources-down tests**

```ts
it("publishes a valid partial snapshot when one source fails", async () => {
  const outcome = await runScan(partialDeps);
  expect(outcome.published).toBe(true);
  expect(outcome.snapshot.status).toBe("partial");
});

it("keeps the previous snapshot when every source fails", async () => {
  const outcome = await runScan(allFailedDeps);
  expect(outcome.published).toBe(false);
  expect(await allFailedDeps.store.getLatest()).toEqual(previousSnapshot);
});
```

- [ ] **Step 2: Write failing atomic storage tests**

Use an in-memory fake store. Prove that a candidate validation failure leaves `snapshots/latest` unchanged, a successful publish moves old latest to `snapshots/previous`, and the scan lock expires.

- [ ] **Step 3: Run tests and confirm failures**

Run: `npm test -- tests/scan/run-scan.test.ts tests/storage/blob-store.test.ts`  
Expected: FAIL because pipeline and store modules do not exist.

- [ ] **Step 4: Implement scan orchestration**

Call adapters concurrently with `Promise.allSettled`. Normalize, filter, dedupe, apply explicit inactive events, apply absence rules only for successful sources, calculate FIT, validate the candidate, and produce a redacted report. Reject a candidate if all adapters failed/blocked or schema validation fails.

- [ ] **Step 5: Implement site-scoped Blob storage**

Use `getStore({ name: "pipe-radar", consistency: "strong" })`. Implement only `get`, `getWithMetadata`, `set`, `setJSON`, and `delete`. Store keys exactly as specified in the design. Acquire `locks/scan` with an expiry timestamp and verify ownership before release.

- [ ] **Step 6: Run tests and commit**

Run: `npm run check`  
Expected: pipeline and storage tests PASS.

```bash
git add src/domain/snapshot.ts src/scan src/storage tests/scan tests/storage
git commit -m "feat: build atomic multi-source scan pipeline"
```

---

### Task 8: Expose Scheduled, Background, and Public Netlify Functions

**Files:**
- Create: `netlify/functions/scan-schedule.ts`
- Create: `netlify/functions/scan-background.ts`
- Create: `netlify/functions/jobs.ts`
- Create: `tests/functions/scan-schedule.test.ts`
- Create: `tests/functions/scan-background.test.ts`
- Create: `tests/functions/jobs.test.ts`
- Modify: `netlify.toml`

**Interfaces:**
- Consumes: `runScan`, `SnapshotStore`, `SCAN_TRIGGER_TOKEN`, `NAV_FEED_TOKEN`, and Netlify function context.
- Produces: scheduled trigger, protected background execution, and `GET /api/jobs`.

- [ ] **Step 1: Write failing method, auth, cache, and fallback tests**

```ts
it("rejects non-GET public API methods", async () => {
  const response = await jobsHandler(new Request("https://site.test/api/jobs", { method: "POST" }), ctx);
  expect(response.status).toBe(405);
});

it("never returns internal diagnostics", async () => {
  const response = await jobsHandler(new Request("https://site.test/api/jobs"), ctxWithSnapshot);
  expect(await response.text()).not.toContain("parserMessage");
});

it("rejects an invalid background trigger token", async () => {
  const response = await scanHandler(new Request("https://site.test/.netlify/functions/scan-background"), ctx);
  expect(response.status).toBe(401);
});
```

- [ ] **Step 2: Run function tests and confirm failures**

Run: `npm test -- tests/functions`  
Expected: FAIL because Netlify functions do not exist.

- [ ] **Step 3: Implement modern Netlify functions**

Use default exports and `Config` only. `jobs.ts` configures `path: "/api/jobs"` and method `GET`. `scan-schedule.ts` configures `schedule: "0 */6 * * *"` and POSTs to `${context.site.url}/.netlify/functions/scan-background` with the server-side bearer token. `scan-background.ts` uses the `-background` filename convention and validates `Authorization: Bearer ${SCAN_TRIGGER_TOKEN}` with constant-time comparison before calling `runScan`.

- [ ] **Step 4: Keep the public API cache safe**

Return `Cache-Control: public, max-age=60, stale-while-revalidate=300`, `Content-Type: application/json; charset=utf-8`, and `X-Content-Type-Options: nosniff`. When no Blob snapshot exists, return the validated seed snapshot with status `fallback` and HTTP 200; reserve HTTP 503 for a missing or invalid seed.

- [ ] **Step 5: Complete Netlify configuration**

Set Node 22, esbuild bundling, function directory, and schedule in `netlify.toml`. Do not place tokens in the file. Read tokens with `Netlify.env.get`.

- [ ] **Step 6: Run tests and commit**

Run: `npm run check`  
Expected: all function tests PASS.

```bash
git add netlify/functions netlify.toml tests/functions
git commit -m "feat: expose scheduled scan and jobs API"
```

---

### Task 9: Integrate Remote Data Without Breaking Local User State

**Files:**
- Create: `src/client/remote-data.js`
- Create: `src/client/status-view.js`
- Create: `tests/client/remote-data.test.ts`
- Create: `tests/client/status-view.test.ts`
- Create: `tests/client/local-storage-regression.test.ts`
- Modify: `index.html:124-290`
- Modify: `index.html:289-end`

**Interfaces:**
- Consumes: `GET /api/jobs`, embedded `FALLBACK_JOBS`, existing render functions, existing localStorage keys.
- Produces: `loadJobs({ fetcher, fallback, timeoutMs })`, `renderDataStatus(meta, target)`, async application bootstrap.

- [ ] **Step 1: Write failing remote, timeout, and corrupt-storage tests**

```ts
it("uses validated remote jobs without writing localStorage", async () => {
  const setItem = vi.spyOn(Storage.prototype, "setItem");
  const result = await loadJobs({ fetcher: remoteFetcher, fallback: seedJobs, timeoutMs: 100 });
  expect(result.mode).toBe("fresh");
  expect(setItem).not.toHaveBeenCalled();
});

it("uses the embedded fallback after API timeout", async () => {
  const result = await loadJobs({ fetcher: neverResolvingFetcher, fallback: seedJobs, timeoutMs: 5 });
  expect(result.mode).toBe("local");
  expect(result.jobs).toEqual(seedJobs);
});

it("does not overwrite corrupt or concurrently changed saved state during boot", async () => {
  localStorage.setItem("pipe-radar-saved-v2", "{broken");
  await bootForTest();
  expect(localStorage.getItem("pipe-radar-saved-v2")).toBe("{broken");
});
```

- [ ] **Step 2: Run client tests and confirm failures**

Run: `npm test -- tests/client`  
Expected: FAIL because client modules and status elements do not exist.

- [ ] **Step 3: Implement remote loading and schema guard**

Fetch `/api/jobs` with an eight-second timeout and `cache: "no-cache"`. Accept only schema version `2.4` and arrays of jobs with unique IDs and valid source URLs. Any parse, transport, or validation error returns embedded fallback jobs and mode `local`.

- [ ] **Step 4: Add honest status UI**

Add a compact badge and a collapsed `<details>` source panel. Map API state to exact Polish labels: `DANE AKTUALNE`, `DANE CZĘŚCIOWE`, `KOPIA AWARYJNA`, and `TRYB LOKALNY`. Show last successful scan and `healthy / total` sources. Do not render internal error text.

- [ ] **Step 5: Replace only the job source during async boot**

Change `const JOBS` to mutable application state initialized from the embedded seed. Load profile and saved-offer state using the existing guarded storage code. Fetch remote jobs, replace only `JOBS`, map saved IDs against the new collection, then call existing `render(false)`. Keep profile, notes, status, and follow-up values untouched.

- [ ] **Step 6: Add the refresh control**

`Pobierz najnowszą bazę` calls `loadJobs` again and rerenders. It must never call the background scan endpoint.

- [ ] **Step 7: Run tests and commit**

Run: `npm run check`  
Expected: client tests and all v2.3.1 regression tests PASS.

```bash
git add src/client tests/client index.html
git commit -m "feat: load live snapshots with local fallback"
```

---

### Task 10: Add Production-Like Integration and Acceptance Checks

**Files:**
- Create: `tests/integration/acceptance.test.ts`
- Create: `scripts/verify-deploy.mjs`
- Create: `tests/fixtures/integration/source-set.json`
- Modify: `package.json`

**Interfaces:**
- Consumes: local Netlify runtime or deployed preview URL.
- Produces: `npm run acceptance` and `node scripts/verify-deploy.mjs "$PIPE_RADAR_PREVIEW_URL"`.

- [ ] **Step 1: Write the failing acceptance test**

Cover: a new job appears after snapshot publish without editing `index.html`; one source failure yields `partial`; all-source failure preserves previous snapshot; duplicate copies merge; explicit inactive disappears; local fallback renders when API is unavailable.

- [ ] **Step 2: Run the acceptance test before wiring its harness**

Run: `npm test -- tests/integration/acceptance.test.ts`  
Expected: FAIL because the in-memory acceptance harness is not configured.

- [ ] **Step 3: Implement the in-memory acceptance harness**

Inject fixture adapters, fixed clock, fake Blob store, and client fetcher. Do not make external network requests in automated tests.

- [ ] **Step 4: Implement deployment verification**

`scripts/verify-deploy.mjs` must request `/`, `/api/jobs`, validate HTTP status and schema, assert no diagnostic/token-like keys, print source health counts, and exit nonzero if the page version or API schema is not 2.4.

- [ ] **Step 5: Add and run the acceptance command**

Add `"acceptance": "vitest run tests/integration/acceptance.test.ts"` to `package.json`.

Run: `npm run check && npm run acceptance`  
Expected: all checks PASS.

- [ ] **Step 6: Commit acceptance coverage**

```bash
git add package.json package-lock.json tests/integration scripts/verify-deploy.mjs
git commit -m "test: add PIPE RADAR v2.4 acceptance suite"
```

---

### Task 11: Document Operations and Prepare the Netlify Preview

**Files:**
- Create: `README.md`
- Create: `.env.example`
- Create: `docs/operations/source-policy.md`
- Create: `docs/operations/netlify-runbook.md`
- Modify: `index.html`

**Interfaces:**
- Consumes: completed code, passing checks, Netlify site access, `NAV_FEED_TOKEN`, and `SCAN_TRIGGER_TOKEN`.
- Produces: reproducible local run instructions, source compliance notes, preview deployment, and rollback procedure.

- [ ] **Step 1: Add exact environment documentation**

`.env.example` contains names only:

```dotenv
NAV_FEED_TOKEN=
SCAN_TRIGGER_TOKEN=
```

README explains `npm install`, `npx netlify dev`, `npm run check`, and `npm run acceptance`. It states that a stable NAV token must be requested under NAV's current terms and stored only in Netlify environment variables.

- [ ] **Step 2: Document source behavior**

For every registry source record its kind, configured discovery URL, parser type, timeout, and allowed failure state. Document that blocked sources remain visible in source health and that no anti-bot bypass is attempted.

- [ ] **Step 3: Document deploy and rollback**

The runbook must specify: authenticate/link the exact `pipe-radar` site, set secrets, deploy preview, copy the returned preview URL into the task-specific `PIPE_RADAR_PREVIEW_URL` variable, run `node scripts/verify-deploy.mjs "$PIPE_RADAR_PREVIEW_URL"`, inspect source health, and promote only after success. Rollback means redeploying the previous known-good Netlify deploy; Blob `snapshots/previous` remains available.

- [ ] **Step 4: Update public version copy**

Change visible version to `v2.4.0`. Replace the claim that the application never fetches offers with truthful copy explaining automatic snapshots and source limitations.

- [ ] **Step 5: Run final local verification**

Run: `npm ci`  
Run: `npm run check`  
Run: `npm run acceptance`  
Run: `git diff --check`  
Expected: all commands exit 0.

- [ ] **Step 6: Commit documentation and release preparation**

```bash
git add README.md .env.example docs/operations index.html
git commit -m "docs: add PIPE RADAR v2.4 operations runbook"
```

- [ ] **Step 7: Stop at the external access boundary if Netlify is not authenticated**

Run: `npx netlify status`  
Expected when blocked: `Not logged in.` Report that preview/production deployment requires the user's Netlify authorization; do not create a different site or guess credentials.

---

### Task 12: Preview, Production Release, and Post-Deploy Verification

**Files:**
- Modify only if verification finds a defect: the owning source, domain, function, or client file plus its regression test.

**Interfaces:**
- Consumes: linked Netlify site, passing local suite, configured secrets, and approved preview.
- Produces: verified production v2.4 and recorded deploy evidence.

- [ ] **Step 1: Deploy a preview**

Run: `npx netlify deploy`  
Expected: a unique preview URL and successful function bundling. Copy the exact returned URL into the task-specific `PIPE_RADAR_PREVIEW_URL` shell variable before the following verification steps.

- [ ] **Step 2: Configure and trigger the protected test scan**

Use the Netlify environment settings for `NAV_FEED_TOKEN` and `SCAN_TRIGGER_TOKEN`. Invoke the protected background endpoint once using the configured token without printing the token in logs.

- [ ] **Step 3: Verify the preview**

Run: `node scripts/verify-deploy.mjs "$PIPE_RADAR_PREVIEW_URL"`  
Expected: page version 2.4, schema 2.4, valid snapshot, source counts, no internal diagnostics.

- [ ] **Step 4: Verify failure behavior on preview**

Use the test-only preview configuration to force one fixture adapter to fail. Confirm `DANE CZĘŚCIOWE`, unchanged working-source jobs, and preservation of the previous snapshot. Remove the test configuration before production.

- [ ] **Step 5: Deploy production**

Run: `npx netlify deploy --prod`  
Expected: successful production URL `https://pipe-radar.netlify.app/`.

- [ ] **Step 6: Verify production independently**

Run: `node scripts/verify-deploy.mjs https://pipe-radar.netlify.app/`  
Open the site on desktop and mobile widths. Confirm the update timestamp, source health, filters, comparison, calculator, saved offers, notes, and refresh control.

- [ ] **Step 7: Record the release commit**

```bash
git status --short
git log --oneline --decorate -12
```

Expected: no uncommitted product changes and a complete task-by-task history. Tag only after production verification:

```bash
git tag -a v2.4.0 -m "PIPE RADAR v2.4.0"
```
