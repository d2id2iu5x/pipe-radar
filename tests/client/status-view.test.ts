import { describe, expect, it } from "vitest";
import { renderDataStatus } from "../../src/client/status-view.js";

describe("data status view", () => {
  it.each([
    ["fresh", "DANE AKTUALNE"], ["partial", "DANE CZĘŚCIOWE"],
    ["fallback", "KOPIA AWARYJNA"], ["local", "TRYB LOKALNY"]
  ])("maps %s to its honest Polish label", (mode, label) => {
    const target = document.createElement("div");
    renderDataStatus({ mode, lastSuccessfulScanAt: "2026-09-24T12:00:00.000Z", sources: [{ id: "nav", status: "success" }, { id: "finn", status: "failed", diagnosticCode: "<script>bad</script>" }] }, target);
    expect(target.querySelector("[data-status-label]")?.textContent).toBe(label);
    expect(target.textContent).toContain("1 / 2");
    expect(target.innerHTML).not.toContain("<script>");
    expect(target.textContent).not.toContain("diagnosticCode");
  });
});
