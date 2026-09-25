import { createHash, timingSafeEqual } from "node:crypto";
import type { Config, Context } from "@netlify/functions";
import { runScan } from "../../src/scan/run-scan.js";
import { createBlobSnapshotStore } from "../../src/storage/blob-store.js";
import { getSourceRegistry } from "../../src/sources/registry.js";
import { loadSeedSnapshot } from "./jobs.js";

interface ScanDependencies { token?: string; run?: () => Promise<unknown> }

declare const Netlify: { env?: { get(key: string): string | undefined } } | undefined;

function netlifyEnv(name: string): string | undefined {
  if (typeof Netlify !== "undefined") {
    const value = Netlify?.env?.get(name);
    if (value !== undefined) return value;
  }
  return process.env[name];
}

function equalSecret(left: string, right: string): boolean {
  const a = createHash("sha256").update(left).digest();
  const b = createHash("sha256").update(right).digest();
  return timingSafeEqual(a, b);
}

export async function productionScan(): Promise<unknown> {
  const adapters = getSourceRegistry().flatMap(source => source.adapter ? [source.adapter] : []);
  const recoverySnapshot = await loadSeedSnapshot();
  return runScan({
    adapters,
    store: createBlobSnapshotStore(),
    now: () => new Date(),
    context: { fetcher: fetch, env: { NAV_FEED_TOKEN: netlifyEnv("NAV_FEED_TOKEN") } },
    recoverySnapshot
  });
}

export async function scanHandler(request: Request, _context: Context, dependencies: ScanDependencies = {}): Promise<Response> {
  const expected = dependencies.token ?? netlifyEnv("SCAN_TRIGGER_TOKEN");
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!expected) {
    console.warn('pipe-radar scan rejected {"reason":"scan-not-configured"}');
    return new Response(JSON.stringify({ error: "scan-not-configured" }), { status: 503 });
  }
  if (!supplied || !equalSecret(supplied, expected)) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
  if (request.method !== "POST") return new Response(null, { status: 405, headers: { Allow: "POST" } });
  try {
    const outcome = await (dependencies.run ?? productionScan)() as { published?: unknown; reason?: unknown };
    console.info(`pipe-radar scan complete ${JSON.stringify({
      published: outcome?.published === true,
      reason: typeof outcome?.reason === "string" ? outcome.reason : null
    })}`);
  } catch (cause) {
    const failure = cause instanceof Error ? cause : new Error("Unknown scan failure");
    console.error(`pipe-radar scan failed ${JSON.stringify({ name: failure.name, message: failure.message })}`);
    throw cause;
  }
  return new Response(JSON.stringify({ accepted: true }), { status: 202, headers: { "Content-Type": "application/json" } });
}

export default scanHandler;
export const config: Config = { path: "/.netlify/functions/scan-background", method: "POST", background: true };
