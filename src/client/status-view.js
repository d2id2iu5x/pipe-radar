const LABELS = Object.freeze({
  fresh: "DANE AKTUALNE",
  partial: "DANE CZĘŚCIOWE",
  fallback: "KOPIA AWARYJNA",
  local: "TRYB LOKALNY"
});

export function renderDataStatus(meta, target) {
  const badge = document.createElement("strong");
  badge.dataset.statusLabel = "";
  badge.textContent = LABELS[meta.mode] ?? LABELS.local;

  const timestamp = document.createElement("small");
  timestamp.textContent = meta.lastSuccessfulScanAt
    ? `Ostatni udany skan: ${new Date(meta.lastSuccessfulScanAt).toLocaleString("pl-PL")}`
    : "Brak zdalnego skanu — używana jest baza dołączona do strony.";

  const sources = Array.isArray(meta.sources) ? meta.sources : [];
  const healthy = sources.filter(source => source.status === "success").length;
  const details = document.createElement("details");
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
  target.replaceChildren(badge, timestamp, details);
}
