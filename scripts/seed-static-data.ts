import { resolve } from "node:path";
import { createFileSnapshotStore } from "../src/storage/file-store.js";
import { loadSeedSnapshot } from "../src/storage/seed-snapshot.js";

const snapshot = await loadSeedSnapshot();
await createFileSnapshotStore({ statePath: resolve("data/scan-state.json"), publicPath: resolve("data/jobs.json") })
  .publish(snapshot, { jobs: Object.fromEntries(snapshot.jobs.map(job => [job.id, job])), audit: {} }, { outcome: "seed" });
