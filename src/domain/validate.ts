import type { Job, PublicSnapshot, Snapshot, SourceHealth } from "./types.js";

function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function iso(value: unknown, field: string): asserts value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T/.test(value) || Number.isNaN(Date.parse(value))) throw new Error(`Invalid ${field} timestamp`);
}

function httpUrl(value: unknown): asserts value is string {
  if (typeof value !== "string") throw new Error("Invalid source URL");
  let parsed: URL;
  try { parsed = new URL(value); } catch { throw new Error("Invalid source URL"); }
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error("Invalid source URL");
}

function validateJob(value: unknown, sources: Set<string>): asserts value is Job {
  if (!object(value) || typeof value.id !== "string" || !value.id) throw new Error("Invalid job id");
  httpUrl(value.url);
  if (!Array.isArray(value.sources) || value.sources.length === 0) throw new Error("Missing source references");
  for (const reference of value.sources) {
    if (!object(reference) || typeof reference.sourceId !== "string" || !sources.has(reference.sourceId)) throw new Error("Missing source reference");
    httpUrl(reference.url);
  }
  iso(value.firstSeenAt, "firstSeenAt");
  iso(value.lastSeenAt, "lastSeenAt");
  iso(value.lastVerifiedAt, "lastVerifiedAt");
}

export function validateSnapshot(value: unknown): Snapshot {
  if (!object(value)) throw new Error("Snapshot must be an object");
  if (value.schemaVersion !== "2.4") throw new Error("Unsupported schema version");
  iso(value.generatedAt, "generatedAt");
  iso(value.lastSuccessfulScanAt, "lastSuccessfulScanAt");
  if (!['fresh', 'partial', 'fallback'].includes(String(value.status))) throw new Error("Invalid snapshot status");
  if (!Array.isArray(value.sources) || value.sources.length === 0) throw new Error("Missing scan source metadata");
  const sources = new Set<string>();
  for (const source of value.sources) {
    if (!object(source) || typeof source.id !== "string" || !source.id) throw new Error("Invalid source metadata");
    iso(source.lastCheckedAt, "source lastCheckedAt");
    sources.add(source.id);
  }
  if (!Array.isArray(value.jobs)) throw new Error("Jobs must be an array");
  const ids = new Set<string>();
  for (const job of value.jobs) {
    validateJob(job, sources);
    if (ids.has(job.id)) throw new Error(`Duplicate job id: ${job.id}`);
    ids.add(job.id);
  }
  return value as unknown as Snapshot;
}

export function toPublicSnapshot(snapshot: Snapshot): PublicSnapshot {
  const { internal: _internal, ...publicSnapshot } = snapshot;
  return {
    ...publicSnapshot,
    jobs: publicSnapshot.jobs.map(job => ({ ...job, sources: job.sources.map(source => ({ ...source })) })),
    sources: publicSnapshot.sources.map((source: SourceHealth) => ({ ...source }))
  };
}
