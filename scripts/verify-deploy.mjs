const base = process.argv[2];
if (!base) {
  console.error("Usage: node scripts/verify-deploy.mjs <preview-url>");
  process.exit(2);
}

const origin = new URL(base);
const [pageResponse, apiResponse] = await Promise.all([
  fetch(new URL("/", origin), { redirect: "follow" }),
  fetch(new URL("/api/jobs", origin), { headers: { Accept: "application/json" } })
]);

if (!pageResponse.ok) throw new Error(`Page returned HTTP ${pageResponse.status}`);
if (!apiResponse.ok) throw new Error(`API returned HTTP ${apiResponse.status}`);

const page = await pageResponse.text();
if (!/PIPE RADAR\s*\/\s*v2\.4(?:\.0)?|PIPE RADAR v2\.4(?:\.0)?/i.test(page)) throw new Error("Page is not PIPE RADAR v2.4");

const payload = await apiResponse.json();
if (payload?.schemaVersion !== "2.4" || !Array.isArray(payload.jobs) || !Array.isArray(payload.sources)) throw new Error("API schema 2.4 validation failed");

function forbiddenKey(value) {
  if (Array.isArray(value)) return value.some(forbiddenKey);
  if (!value || typeof value !== "object") return false;
  return Object.entries(value).some(([key, nested]) => /token|parser|diagnostic|contact/i.test(key) || forbiddenKey(nested));
}
if (forbiddenKey(payload)) throw new Error("Public API exposes an internal or token-like key");

const healthy = payload.sources.filter(source => source.status === "success").length;
console.log(`PIPE RADAR v2.4 verified: ${payload.jobs.length} jobs; ${healthy}/${payload.sources.length} healthy sources; status=${payload.status}`);
