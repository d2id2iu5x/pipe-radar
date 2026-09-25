import { calculateFit } from "../domain/fit.js";
import { applyLifecycle } from "../domain/lifecycle.js";
import { mergeJobs } from "../domain/dedupe.js";
import { normalizeJob } from "../domain/normalize.js";
import { isRelevantJob } from "../domain/relevance.js";
import { createSnapshot } from "../domain/snapshot.js";
import type { Snapshot, SourceResult } from "../domain/types.js";
import type { SnapshotStore } from "../storage/blob-store.js";
import type { SourceAdapter, SourceContext } from "../sources/types.js";

export interface RunScanDependencies {
  adapters: SourceAdapter[];
  store: SnapshotStore;
  now: () => Date;
  context: Omit<SourceContext, "now">;
  recoverySnapshot?: Snapshot;
}

export interface ScanOutcome {
  published: boolean;
  snapshot: Snapshot;
  reason?: "all-sources-unavailable" | "scan-locked" | "suspicious-drop";
}

function fallbackSources(previous: Snapshot, results: SourceResult[], at: string): Snapshot["sources"] {
  const sources = results.map(result => ({ id: result.sourceId, kind: result.sourceKind, status: result.status, lastCheckedAt: result.finishedAt }));
  const ids = new Set(sources.map(source => source.id));
  for (const job of previous.jobs) for (const reference of job.sources) {
    if (ids.has(reference.sourceId)) continue;
    const prior = previous.sources.find(source => source.id === reference.sourceId);
    sources.push({ id: reference.sourceId, kind: reference.kind, status: "failed", lastCheckedAt: prior?.lastCheckedAt ?? at });
    ids.add(reference.sourceId);
  }
  return sources;
}

export async function runScan(deps: RunScanDependencies): Promise<ScanOutcome> {
  const scanTime = deps.now();
  const lock = await deps.store.acquireLock(scanTime);
  let previous = await deps.store.getLatest();
  if (!lock) {
    if (!previous) throw new Error("Scan locked and no previous snapshot exists");
    return { published: false, snapshot: previous, reason: "scan-locked" };
  }
  try {
    let previousLifecycle = await deps.store.getLifecycle();
    const recovery = deps.recoverySnapshot;
    if (recovery && recovery.jobs.length >= 10 && (!previous || previous.jobs.length < Math.ceil(recovery.jobs.length * 0.2))) {
      previousLifecycle = {
        jobs: {
          ...Object.fromEntries(recovery.jobs.map(job => [job.id, job])),
          ...previousLifecycle.jobs
        },
        audit: previousLifecycle.audit,
        ...(previousLifecycle.cursors ? { cursors: previousLifecycle.cursors } : {})
      };
      previous = recovery;
    }
    const settled = await Promise.allSettled(deps.adapters.map(adapter => adapter.scan({
      ...deps.context,
      now: deps.now,
      cursor: previousLifecycle.cursors?.[adapter.id]
    })));
    const results: SourceResult[] = settled.map((value, index) => {
      if (value.status === "fulfilled") return value.value;
      const adapter = deps.adapters[index];
      if (!adapter) throw value.reason;
      const timestamp = scanTime.toISOString();
      return { sourceId: adapter.id, sourceKind: adapter.kind, status: "failed", jobs: [], startedAt: timestamp, finishedAt: timestamp, diagnosticCode: "adapter-rejected" };
    });
    const usable = results.filter(result => result.status === "success" || result.status === "partial");
    if (usable.length === 0) {
      if (!previous) throw new Error("Every source failed and no previous snapshot exists");
      const fallback: Snapshot = {
        ...previous,
        generatedAt: scanTime.toISOString(),
        status: "fallback",
        sources: fallbackSources(previous, results, scanTime.toISOString())
      };
      await deps.store.publish(fallback, previousLifecycle, {
        generatedAt: scanTime.toISOString(),
        outcome: "all-sources-unavailable",
        sources: results.map(result => ({ id: result.sourceId, status: result.status, http: result.http }))
      });
      return { published: true, snapshot: fallback, reason: "all-sources-unavailable" };
    }
    const normalized = usable.flatMap(result => result.jobs
      .filter(raw => isRelevantJob({ title: raw.title, description: raw.description }))
      .map(raw => normalizeJob(raw, scanTime.toISOString())));
    if (previous && previous.jobs.length >= 10 && normalized.length < Math.ceil(previous.jobs.length * 0.2)) {
      const guarded: Snapshot = {
        ...previous,
        generatedAt: scanTime.toISOString(),
        status: "fallback",
        sources: fallbackSources(previous, results.map(result => result.status === "success" ? { ...result, status: "partial" } : result), scanTime.toISOString())
      };
      await deps.store.publish(guarded, previousLifecycle, { generatedAt: scanTime.toISOString(), outcome: "suspicious-drop" });
      return { published: true, snapshot: guarded, reason: "suspicious-drop" };
    }
    const merged = mergeJobs(normalized).map(job => ({ ...job, fit: calculateFit(job) }));
    const lifecycle = applyLifecycle({
      current: merged,
      previous: previousLifecycle,
      successfulSourceIds: results.filter(result => result.status === "success").map(result => result.sourceId),
      inactiveIds: results.flatMap(result => result.inactiveIds ?? []),
      now: scanTime.toISOString()
    });
    lifecycle.state.cursors = {
      ...(previousLifecycle.cursors ?? {}),
      ...Object.fromEntries(results.filter(result => result.cursor).map(result => [result.sourceId, result.cursor!]))
    };
    const sources = results.map(result => ({ id: result.sourceId, kind: result.sourceKind, status: result.status, lastCheckedAt: result.finishedAt }));
    const knownSourceIds = new Set(sources.map(source => source.id));
    for (const job of lifecycle.jobs) {
      for (const reference of job.sources) {
        if (knownSourceIds.has(reference.sourceId)) continue;
        const prior = previous?.sources.find(source => source.id === reference.sourceId);
        sources.push({ id: reference.sourceId, kind: reference.kind, status: "failed", lastCheckedAt: prior?.lastCheckedAt ?? scanTime.toISOString() });
        knownSourceIds.add(reference.sourceId);
      }
    }
    const snapshot = createSnapshot({
      jobs: lifecycle.jobs,
      sources,
      generatedAt: scanTime.toISOString(),
      status: sources.every(source => source.status === "success") ? "fresh" : "partial"
    });
    const report = { generatedAt: scanTime.toISOString(), sources: results.map(result => ({ id: result.sourceId, status: result.status, http: result.http })) };
    await deps.store.publish(snapshot, lifecycle.state, report);
    return { published: true, snapshot };
  } finally {
    await lock.release();
  }
}
