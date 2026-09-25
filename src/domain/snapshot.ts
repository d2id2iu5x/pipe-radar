import type { Job, Snapshot, SourceHealth, SnapshotStatus } from "./types.js";
import { validateSnapshot } from "./validate.js";

export function createSnapshot(input: {
  jobs: Job[];
  sources: SourceHealth[];
  generatedAt: string;
  status: SnapshotStatus;
}): Snapshot {
  return validateSnapshot({
    schemaVersion: "2.4",
    generatedAt: input.generatedAt,
    lastSuccessfulScanAt: input.generatedAt,
    status: input.status,
    jobs: input.jobs,
    sources: input.sources
  });
}
