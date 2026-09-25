import type { Config, Context } from "@netlify/functions";
import type { Snapshot } from "../../src/domain/types.js";
import { toPublicSnapshot, validateSnapshot } from "../../src/domain/validate.js";
import { createBlobSnapshotStore, type SnapshotStore } from "../../src/storage/blob-store.js";
export { loadSeedSnapshot } from "../../src/storage/seed-snapshot.js";
import { loadSeedSnapshot } from "../../src/storage/seed-snapshot.js";

interface JobsDependencies {
  store: Pick<SnapshotStore, "getLatest">;
  seedLoader?: () => Promise<Snapshot>;
}

const HEADERS = {
  "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
  "Content-Type": "application/json; charset=utf-8",
  "X-Content-Type-Options": "nosniff"
};

function recoverDegradedSnapshot(latest: Snapshot | null, seed: Snapshot): Snapshot {
  if (!latest) return seed;
  if (seed.jobs.length < 10 || latest.jobs.length >= Math.ceil(seed.jobs.length * 0.2)) return latest;
  const jobs = new Map(seed.jobs.map(job => [job.id, job]));
  for (const job of latest.jobs) jobs.set(job.id, job);
  const sources = new Map(seed.sources.map(source => [source.id, source]));
  for (const source of latest.sources) sources.set(source.id, source);
  return validateSnapshot({
    ...latest,
    status: "partial",
    jobs: [...jobs.values()],
    sources: [...sources.values()]
  });
}

export async function jobsHandler(request: Request, _context: Context, dependencies: JobsDependencies = { store: createBlobSnapshotStore() }): Promise<Response> {
  if (request.method !== "GET") return new Response(JSON.stringify({ error: "method-not-allowed" }), { status: 405, headers: { ...HEADERS, Allow: "GET" } });
  try {
    const [latest, seed] = await Promise.all([
      dependencies.store.getLatest(),
      (dependencies.seedLoader ?? loadSeedSnapshot)()
    ]);
    const snapshot = recoverDegradedSnapshot(latest, seed);
    return new Response(JSON.stringify(toPublicSnapshot(validateSnapshot(snapshot))), { status: 200, headers: HEADERS });
  } catch {
    return new Response(JSON.stringify({ error: "snapshot-unavailable" }), { status: 503, headers: HEADERS });
  }
}

export default jobsHandler;
export const config: Config = { path: "/api/jobs", method: "GET" };
