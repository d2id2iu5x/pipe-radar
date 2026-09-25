import { describe, expect, it, vi } from "vitest";
import { fetchSource } from "../../src/sources/http.js";

describe("safe source fetch", () => {
  it("retries one 503 and then succeeds", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response("busy", { status: 503 }))
      .mockResolvedValueOnce(new Response("ok"));
    const response = await fetchSource({ url: "https://example.test", fetcher, timeoutMs: 50 });
    expect(response.status).toBe("success");
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("classifies a CAPTCHA page as blocked without retry loops", async () => {
    const fetcher = vi.fn(async () => new Response("Verify you are human", { status: 403 }));
    const response = await fetchSource({ url: "https://example.test", fetcher, timeoutMs: 50 });
    expect(response.status).toBe("blocked");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("retries a timeout only once and reports failure without throwing", async () => {
    const timeout = Object.assign(new Error("timed out"), { name: "TimeoutError" });
    const fetcher = vi.fn().mockRejectedValue(timeout);
    const response = await fetchSource({ url: "https://example.test", fetcher, timeoutMs: 5 });
    expect(response).toMatchObject({ status: "failed", diagnosticCode: "timeout" });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("sends transparent headers", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => new Response("ok"));
    await fetchSource({ url: "https://example.test", fetcher, timeoutMs: 50 });
    const headers = new Headers(fetcher.mock.calls[0]?.[1]?.headers);
    expect(headers.get("user-agent")).toMatch(/PIPE RADAR/i);
    expect(headers.get("accept")).toContain("text/html");
  });
});
