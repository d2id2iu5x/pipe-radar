import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderDataStatus } from "../../src/client/status-view.js";

const NOW = "2026-10-16T12:00:00.000Z";
const WARNING = "DANE WYMAGAJĄ PONOWNEJ WERYFIKACJI";
const success = [{ id: "nav", status: "success" }];
function render(meta: Record<string, unknown>) {
  const target = document.createElement("div");
  renderDataStatus({ mode: "fresh", lastSuccessfulScanAt: NOW, sources: success, ...meta }, target);
  return target;
}
const label = (target: HTMLElement) => target.querySelector("[data-status-label]")?.textContent;

describe("data status view", () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date(NOW)); });
  afterEach(() => vi.useRealTimers());

  it.each([
    ["fresh", "DANE AKTUALNE"], ["partial", "DANE CZĘŚCIOWE"],
    ["fallback", "KOPIA AWARYJNA"], ["local", "TRYB LOKALNY"]
  ])("preserves %s with a recent valid scan", (mode, expected) => {
    expect(label(render({ mode }))).toBe(expected);
  });

  it.each([
    ["2026-10-15T12:00:00.001Z", "DANE AKTUALNE"],
    ["2026-10-15T12:00:00.000Z", "DANE AKTUALNE"],
    ["2026-10-15T11:59:59.999Z", WARNING],
    ["2026-10-10T12:00:00.000Z", WARNING]
  ])("checks the strict 24-hour boundary for %s", (date, expected) => {
    const target = render({ lastSuccessfulScanAt: date });
    expect(label(target)).toBe(expected);
    expect(target.textContent).toContain(`Ostatni udany skan: ${new Date(date).toLocaleString("pl-PL")}`);
  });

  it.each([undefined, null, "", "bad date", "16.10.2026", 1792152000000,
    "2026-10-16", "2026-10-16T12:00:00", "2026-02-30T12:00:00Z", "2026-10-16T25:00:00Z"])(
    "does not claim freshness for an absent or invalid date %s", date => {
      const target = render({ lastSuccessfulScanAt: date });
      expect(label(target)).toBe(WARNING);
      expect(target.textContent).toContain("Ostatni udany skan:");
      expect(target.textContent).not.toContain("Invalid Date");
      expect(target.textContent).not.toContain("DANE AKTUALNE");
    }
  );

  it("warns on a future date and still shows the reported date", () => {
    const date = "2026-10-16T12:00:00.001Z";
    const target = render({ lastSuccessfulScanAt: date });
    expect(label(target)).toBe(WARNING);
    expect(target.textContent).toContain("z przyszłości");
    expect(target.textContent).toContain(new Date(date).toLocaleString("pl-PL"));
  });

  it("compares absolute instants with an explicit time-zone offset", () => {
    expect(label(render({ lastSuccessfulScanAt: "2026-10-15T14:00:00+02:00" }))).toBe("DANE AKTUALNE");
    expect(label(render({ lastSuccessfulScanAt: "2026-10-15T13:59:59.999+02:00" }))).toBe(WARNING);
  });

  it("accepts a real leap day but rejects a normalized impossible day", () => {
    vi.setSystemTime(new Date("2028-03-01T12:00:00Z"));
    expect(label(render({ lastSuccessfulScanAt: "2028-02-29T12:00:00Z" }))).toBe("DANE AKTUALNE");
    expect(label(render({ lastSuccessfulScanAt: "2028-02-30T12:00:00Z" }))).toBe(WARNING);
  });

  it.each(["failed", "blocked", "disabled"])("keeps a %s source failure visible beside a working source", status => {
    const target = render({ sources: [...success, { id: "other", status }] });
    expect(label(target)).toBe("DANE CZĘŚCIOWE");
    expect(target.textContent).toContain(`other: ${status}`);
  });

  it("does not mistake a partially usable source for a complete scan", () => {
    expect(label(render({ sources: [{ id: "nav", status: "partial" }] }))).toBe("DANE CZĘŚCIOWE");
  });

  it.each(["fresh", "partial", "fallback", "local"])("warns about old %s data without changing source information", mode => {
    const sources = [{ id: "nav", status: "success" }, { id: "finn", status: "failed", diagnosticCode: "<script>bad</script>" }];
    const meta = { mode, lastSuccessfulScanAt: "2026-10-14T12:00:00Z", sources };
    const before = JSON.stringify(meta);
    const target = render(meta);
    expect(label(target)).toBe(WARNING);
    expect(target.textContent).toContain("1 / 2");
    expect(target.textContent).toContain("finn: failed");
    expect(target.innerHTML).not.toContain("<script>");
    expect(target.textContent).not.toContain("diagnosticCode");
    expect(target.textContent).not.toContain("DANE AKTUALNE");
    expect(JSON.stringify(meta)).toBe(before);
  });

  it("keeps partial source failure visible even if snapshot says fresh", () => {
    const target = render({ sources: [...success, { id: "finn", status: "failed" }] });
    expect(label(target)).toBe("DANE CZĘŚCIOWE");
    expect(target.textContent).toContain("1 / 2");
  });

  it("keeps complete failure visible even with a recent date", () => {
    const target = render({ sources: [{ id: "nav", status: "failed" }] });
    expect(label(target)).toBe("KOPIA AWARYJNA");
    expect(target.textContent).toContain("0 / 1");
  });

  it("does not claim current data when source health is absent", () => {
    expect(label(render({ sources: [] }))).not.toBe("DANE AKTUALNE");
  });

  it("keeps local fallback identifiable when no scan date exists", () => {
    const target = render({ mode: "local", lastSuccessfulScanAt: null, sources: [] });
    expect(label(target)).toBe(WARNING);
    expect(target.textContent).toContain("TRYB LOKALNY");
  });
});
