import { describe, expect, it, vi } from "vitest";
import { scanHandler } from "../../netlify/functions/scan-background.js";

describe("background scan function", () => {
  it("uses the Node runtime environment when the Netlify global is unavailable", async () => {
    vi.stubEnv("SCAN_TRIGGER_TOKEN", "runtime-token");
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const run = vi.fn(async () => ({ published: true }));
    const request = new Request("https://site.test/.netlify/functions/scan-background", { method: "POST", headers: { Authorization: "Bearer runtime-token" } });

    const response = await scanHandler(request, {} as never, { run });

    expect(response.status).toBe(202);
    expect(run).toHaveBeenCalledOnce();
    info.mockRestore();
    vi.unstubAllEnvs();
  });

  it("logs when the runtime scan token is unavailable", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const response = await scanHandler(new Request("https://site.test/.netlify/functions/scan-background", { method: "POST" }), {} as never);

    expect(response.status).toBe(503);
    expect(warn).toHaveBeenCalledWith('pipe-radar scan rejected {"reason":"scan-not-configured"}');
    warn.mockRestore();
  });

  it("rejects an invalid background trigger token", async () => {
    const run = vi.fn();
    const response = await scanHandler(new Request("https://site.test/.netlify/functions/scan-background"), {} as never, { token: "valid-token", run });
    expect(response.status).toBe(401);
    expect(run).not.toHaveBeenCalled();
  });

  it("starts the scan only for the exact bearer token", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const run = vi.fn(async () => ({ published: true }));
    const response = await scanHandler(new Request("https://site.test/.netlify/functions/scan-background", { method: "POST", headers: { Authorization: "Bearer valid-token" } }), {} as never, { token: "valid-token", run });
    expect(response.status).toBe(202);
    expect(run).toHaveBeenCalledOnce();
    expect(info).toHaveBeenCalledWith('pipe-radar scan complete {"published":true,"reason":null}');
    info.mockRestore();
  });

  it("logs a safe failure summary before rethrowing a scan error", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const request = new Request("https://site.test/.netlify/functions/scan-background", { method: "POST", headers: { Authorization: "Bearer valid-token" } });

    await expect(scanHandler(request, {} as never, { token: "valid-token", run: async () => { throw new Error("storage unavailable"); } }))
      .rejects.toThrow("storage unavailable");
    expect(error).toHaveBeenCalledWith('pipe-radar scan failed {"name":"Error","message":"storage unavailable"}');
    error.mockRestore();
  });
});
