import { resolve } from "node:path";
import { runFileScan } from "../src/scan/file-scan.js";
import { loadSeedSnapshot } from "../src/storage/seed-snapshot.js";
import { getSourceRegistry } from "../src/sources/registry.js";

const adapters = getSourceRegistry().flatMap(source => source.adapter ? [source.adapter] : []);
const outcome = await runFileScan({
  adapters,
  paths: { statePath: resolve("data/scan-state.json"), publicPath: resolve("data/jobs.json") },
  now: () => new Date(),
  context: { fetcher: fetch, env: { NAV_FEED_TOKEN: process.env.NAV_FEED_TOKEN } },
  recoverySnapshot: await loadSeedSnapshot()
});

console.info(JSON.stringify({ published: outcome.published, status: outcome.snapshot.status, jobs: outcome.snapshot.jobs.length, reason: outcome.reason ?? null }));
