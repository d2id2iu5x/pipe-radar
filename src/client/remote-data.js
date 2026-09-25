function validHttpUrl(value) {
  try { return ["http:", "https:"].includes(new URL(value).protocol); } catch { return false; }
}

function validatePayload(value) {
  if (!value || typeof value !== "object" || value.schemaVersion !== "2.4") throw new Error("Unsupported job schema");
  if (!Array.isArray(value.jobs) || !Array.isArray(value.sources)) throw new Error("Missing job data");
  const ids = new Set();
  for (const job of value.jobs) {
    if (!job || typeof job !== "object" || typeof job.id !== "string" || ids.has(job.id)) throw new Error("Invalid or duplicate job id");
    if (!validHttpUrl(job.url) || !Array.isArray(job.sources) || job.sources.length === 0 || job.sources.some(source => !validHttpUrl(source?.url))) throw new Error("Invalid source URL");
    ids.add(job.id);
  }
  if (!["fresh", "partial", "fallback"].includes(value.status)) throw new Error("Invalid snapshot status");
  return value;
}

export async function loadJobs({ fetcher = fetch, fallback, timeoutMs = 8000 }) {
  const controller = new AbortController();
  let timer;
  try {
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => { controller.abort(); reject(new Error("Job API timeout")); }, timeoutMs);
    });
    const response = await Promise.race([
      fetcher("/data/jobs.json", { cache: "no-cache", signal: controller.signal }),
      timeout
    ]);
    if (!(response instanceof Response) || !response.ok) throw new Error("Job API unavailable");
    const payload = validatePayload(await response.json());
    return {
      mode: payload.status,
      jobs: payload.jobs,
      generatedAt: payload.generatedAt,
      lastSuccessfulScanAt: payload.lastSuccessfulScanAt,
      sources: payload.sources
    };
  } catch {
    return { mode: "local", jobs: fallback, generatedAt: null, lastSuccessfulScanAt: null, sources: [] };
  } finally {
    clearTimeout(timer);
  }
}

export async function bootJobData(options) {
  const result = await loadJobs(options);
  options.apply(result);
  return result;
}
