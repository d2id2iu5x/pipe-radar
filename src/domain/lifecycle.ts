import type { Job } from "./types.js";

export interface LifecycleAuditRecord {
  id: string;
  sourceId: string;
  sourceJobId: string;
  status: "archived";
  lastSeenAt: string;
  archivedAt: string;
  reason: "explicit-inactive" | "three-successful-absences";
}

export interface LifecycleState {
  jobs: Record<string, Job>;
  audit: Record<string, LifecycleAuditRecord>;
  cursors?: Record<string, Record<string, string>>;
}

export interface LifecycleInput {
  current: Job[];
  previous?: LifecycleState;
  successfulSourceIds: string[];
  inactiveIds: string[];
  now: string;
}

export interface LifecycleResult { jobs: Job[]; state: LifecycleState }

export function redactInactiveNav(job: Job, archivedAt = new Date().toISOString()): LifecycleAuditRecord {
  return {
    id: job.id,
    sourceId: job.sourceId,
    sourceJobId: job.sourceJobId,
    status: "archived",
    lastSeenAt: job.lastSeenAt,
    archivedAt,
    reason: "explicit-inactive"
  };
}

export function applyLifecycle(input: LifecycleInput): LifecycleResult {
  const previous = input.previous ?? { jobs: {}, audit: {} };
  const successful = new Set(input.successfulSourceIds);
  const inactive = new Set(input.inactiveIds);
  const nextJobs: Record<string, Job> = {};
  const audit = { ...previous.audit };
  const isInactive = (job: Job) => job.sources.some(source => inactive.has(`${source.sourceId}:${source.sourceJobId}`));
  const withoutInactiveSources = (job: Job): Job => ({ ...job, sources: job.sources.filter(source => !inactive.has(`${source.sourceId}:${source.sourceJobId}`)) });

  for (const id of inactive) {
    const prior = previous.jobs[id] ?? input.current.find(job => job.id === id);
    if (prior) audit[id] = redactInactiveNav(prior, input.now);
  }

  for (const candidate of input.current) {
    if (inactive.has(candidate.id) && candidate.sources.length <= 1) continue;
    const incoming = isInactive(candidate) ? withoutInactiveSources(candidate) : candidate;
    if (!incoming.sources.length) continue;
    const prior = previous.jobs[incoming.id];
    const firstSeenAt = prior?.firstSeenAt ?? incoming.firstSeenAt;
    const age = Date.parse(input.now) - Date.parse(firstSeenAt);
    nextJobs[incoming.id] = {
      ...incoming,
      firstSeenAt,
      lastSeenAt: input.now,
      lastVerifiedAt: input.now,
      missingSuccessfulScans: 0,
      status: age <= 72 * 60 * 60 * 1000 ? "new" : "active"
    };
  }

  for (const prior of Object.values(previous.jobs)) {
    if (inactive.has(prior.id) || nextJobs[prior.id]) continue;
    const sourceWasSuccessful = prior.sources.some(source => successful.has(source.sourceId));
    const missingSuccessfulScans = prior.missingSuccessfulScans + (sourceWasSuccessful ? 1 : 0);
    const stale = Date.parse(input.now) - Date.parse(prior.lastVerifiedAt) > 14 * 24 * 60 * 60 * 1000;
    const status = missingSuccessfulScans >= 3 ? "archived" : missingSuccessfulScans >= 2 || stale ? "uncertain" : prior.status === "new" ? "active" : prior.status;
    const retained = { ...(isInactive(prior) ? withoutInactiveSources(prior) : prior), missingSuccessfulScans, status };
    nextJobs[prior.id] = retained;
    if (missingSuccessfulScans >= 3) {
      audit[prior.id] = {
        id: prior.id, sourceId: prior.sourceId, sourceJobId: prior.sourceJobId,
        status: "archived", lastSeenAt: prior.lastSeenAt, archivedAt: input.now,
        reason: "three-successful-absences"
      };
    }
  }

  return { jobs: Object.values(nextJobs), state: { jobs: nextJobs, audit, ...(previous.cursors ? { cursors: previous.cursors } : {}) } };
}
