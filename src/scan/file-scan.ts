import type { Snapshot } from "../domain/types.js";
import { createFileSnapshotStore, type FileStorePaths } from "../storage/file-store.js";
import type { SourceAdapter, SourceContext } from "../sources/types.js";
import { runScan, type ScanOutcome } from "./run-scan.js";

export interface FileScanOptions {
  adapters: SourceAdapter[];
  paths: FileStorePaths;
  now: () => Date;
  context: Omit<SourceContext, "now">;
  recoverySnapshot?: Snapshot;
}

export async function runFileScan(options: FileScanOptions): Promise<ScanOutcome> {
  return runScan({
    adapters: options.adapters,
    store: createFileSnapshotStore(options.paths),
    now: options.now,
    context: options.context,
    ...(options.recoverySnapshot ? { recoverySnapshot: options.recoverySnapshot } : {})
  });
}
