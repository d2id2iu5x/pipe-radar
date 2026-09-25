export type SourceKind = "employer" | "official-api" | "portal" | "aggregator";
export type SourceRunStatus = "success" | "partial" | "blocked" | "failed";
export type JobStatus = "new" | "active" | "uncertain" | "archived";
export type SnapshotStatus = "fresh" | "partial" | "fallback";

export interface RawJob {
  sourceId: string;
  sourceJobId: string;
  sourceKind: SourceKind;
  url: string;
  title: string;
  company: string;
  country: string;
  location?: string;
  employmentType?: string;
  rotation?: string;
  rate?: string;
  housing?: string;
  travel?: string;
  skills?: string | string[];
  tags?: string[];
  description?: string;
  publishedAt?: string;
  legacyFit?: number;
}

export interface SourceReference {
  sourceId: string;
  sourceJobId: string;
  kind: SourceKind;
  url: string;
}

export interface NormalizedRate {
  raw: string;
  currency: string | null;
  hourlyMin: number | null;
  hourlyMax: number | null;
  approximate: boolean;
}

export interface DisplayTerm {
  raw: string;
  normalized: string | null;
}

export interface FitAdjustment { label: string; points: number }
export interface FitBreakdown {
  base: number;
  adjustments: FitAdjustment[];
  raw: number;
  score: number;
}

export interface Job {
  id: string;
  sourceId: string;
  sourceJobId: string;
  sourceKind: SourceKind;
  url: string;
  sources: SourceReference[];
  title: string;
  company: string;
  country: string;
  location: string;
  employmentType: string;
  rotation: DisplayTerm;
  rate: NormalizedRate;
  housing: DisplayTerm;
  travel: DisplayTerm;
  skills: string[];
  tags: string[];
  description: string;
  publishedAt: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  lastVerifiedAt: string;
  missingSuccessfulScans: number;
  status: JobStatus;
  conflicts: string[];
  fit: FitBreakdown;
  legacyFit: number;
}

export interface SourceHealth {
  id: string;
  kind: SourceKind;
  status: SourceRunStatus;
  lastCheckedAt: string;
}

export interface Snapshot {
  schemaVersion: "2.4";
  generatedAt: string;
  lastSuccessfulScanAt: string;
  status: SnapshotStatus;
  jobs: Job[];
  sources: SourceHealth[];
  internal?: Record<string, unknown>;
}

export type PublicSnapshot = Omit<Snapshot, "internal">;

export interface SourceResult {
  sourceId: string;
  sourceKind: SourceKind;
  status: SourceRunStatus;
  jobs: RawJob[];
  inactiveIds?: string[];
  startedAt: string;
  finishedAt: string;
  http?: { requests: number; succeeded: number; failed: number };
  diagnosticCode?: string;
  cursor?: Record<string, string>;
}
