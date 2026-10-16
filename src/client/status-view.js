const LABELS = Object.freeze({
  fresh: "DANE AKTUALNE",
  partial: "DANE CZĘŚCIOWE",
  fallback: "KOPIA AWARYJNA",
  local: "TRYB LOKALNY"
});

const MAX_SCAN_AGE_MS = 24 * 60 * 60 * 1000;
const WARNING = "DANE WYMAGAJĄ PONOWNEJ WERYFIKACJI";

function scanFreshness(value, now) {
  if (value == null || value === "") return { timestamp: null, reason: "Brak daty ostatniego skutecznego skanu." };
  // Require an explicit time zone. Date.parse alone accepts ambiguous local
  // dates and normalizes impossible calendar days (for example February 30).
  const parts = typeof value === "string" && value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/);
  const timestamp = parts ? Date.parse(value) : NaN;
  const year = Number(parts?.[1]), month = Number(parts?.[2]), day = Number(parts?.[3]);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (!Number.isFinite(timestamp) || month < 1 || month > 12 || day < 1 || day > days[month - 1] || Number(parts?.[4]) > 23) {
    return { timestamp: null, reason: "Nieprawidłowa data ostatniego skutecznego skanu." };
  }
  if (timestamp > now) return { timestamp, reason: "Data ostatniego skutecznego skanu jest z przyszłości." };
  if (now - timestamp > MAX_SCAN_AGE_MS) return { timestamp, reason: "Ostatni skuteczny skan jest starszy niż 24 godziny." };
  return { timestamp, reason: null };
}

function sourceMode(meta, sources) {
  const mode = Object.hasOwn(LABELS, meta.mode) ? meta.mode : "local";
  if (mode === "local" || mode === "fallback") return mode;
  if (!sources.length) return "partial";
  if (!sources.some(source => source.status === "success" || source.status === "partial")) return "fallback";
  return mode === "partial" || sources.some(source => source.status !== "success") ? "partial" : "fresh";
}

export function renderDataStatus(meta, target, { now = Date.now() } = {}) {
  const freshness = scanFreshness(meta.lastSuccessfulScanAt, now);
  const sources = Array.isArray(meta.sources) ? meta.sources.filter(source => source && typeof source === "object") : [];
  const mode = sourceMode(meta, sources);
  target.dataset.needsVerification = String(Boolean(freshness.reason));
  const badge = document.createElement("strong");
  badge.dataset.statusLabel = "";
  badge.textContent = freshness.reason ? WARNING : LABELS[mode];

  const timestamp = document.createElement("small");
  timestamp.textContent = freshness.timestamp !== null
    ? `Ostatni udany skan: ${new Date(freshness.timestamp).toLocaleString("pl-PL")}`
    : "Ostatni udany skan: brak poprawnej daty.";

  const explanation = document.createElement("small");
  if (freshness.reason) {
    // Never repeat DATA CURRENT below an age warning. Preserve the distinction
    // between partial sources, a retained remote copy and the embedded fallback.
    if (mode !== "fresh") explanation.append(document.createTextNode(LABELS[mode]), document.createTextNode(" · "));
    explanation.append(document.createTextNode(freshness.reason));
  }

  const healthy = sources.filter(source => source.status === "success").length;
  const details = document.createElement("details");
  details.open = target.querySelector("details")?.open ?? false;
  const summary = document.createElement("summary");
  summary.textContent = `Źródła: ${healthy} / ${sources.length} działających`;
  details.append(summary);
  const list = document.createElement("ul");
  for (const source of sources) {
    const item = document.createElement("li");
    item.textContent = `${source.id}: ${source.status}`;
    list.append(item);
  }
  details.append(list);
  target.replaceChildren(badge, timestamp, ...(freshness.reason ? [explanation] : []), details);
}

// Recheck the displayed snapshot as time passes, without fetching or altering
// jobs. Focus/pageshow also cover sleeping laptops and suspended browser tabs.
export function createDataStatusView(target, { now = Date.now } = {}) {
  let meta, timer, previousSignature, disposed = false;
  function refresh() {
    clearTimeout(timer);
    if (!meta || disposed) return;
    const currentTime = now();
    const freshness = scanFreshness(meta.lastSuccessfulScanAt, currentTime);
    const signature = JSON.stringify([meta.mode, meta.lastSuccessfulScanAt, meta.sources, freshness.reason]);
    if (signature !== previousSignature) {
      renderDataStatus(meta, target, { now: currentTime });
      previousSignature = signature;
    }
    const delay = freshness.reason || freshness.timestamp === null
      ? 60000 : Math.min(60000, MAX_SCAN_AGE_MS - (currentTime - freshness.timestamp) + 1);
    timer = setTimeout(refresh, delay);
  }
  window.addEventListener("focus", refresh);
  window.addEventListener("pageshow", refresh);
  document.addEventListener("visibilitychange", refresh);
  return {
    update(next) { meta = next; refresh(); },
    dispose() {
      disposed = true;
      clearTimeout(timer);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("pageshow", refresh);
      document.removeEventListener("visibilitychange", refresh);
    }
  };
}
