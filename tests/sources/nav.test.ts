import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { createNavAdapter } from "../../src/sources/nav.js";
import type { SourceContext } from "../../src/sources/types.js";

const read = (name: string) => readFileSync(`tests/fixtures/nav/${name}`, "utf8");
const now = () => new Date("2026-09-24T12:00:00.000Z");

function context(feed: string, detail = read("job-active.json")): SourceContext {
  return {
    now,
    env: { NAV_FEED_TOKEN: "test-token" },
    maxPages: 1,
    cursor: { etag: '"old"', lastModified: "Wed, 23 Sep 2026 12:00:00 GMT" },
    fetcher: vi.fn<typeof fetch>(async input => {
      const url = String(input);
      return new Response(url.includes("/ads/") ? detail : feed, {
        status: 200,
        headers: { ETag: '"new"', "Last-Modified": "Thu, 24 Sep 2026 12:00:00 GMT" }
      });
    })
  };
}

describe("NAV vacancy feed", () => {
  it("follows the bounded cursor and fetches details only for relevant active entries", async () => {
    const ctx = context(read("feed-active.json"));
    const result = await createNavAdapter().scan(ctx);
    expect(result.status).toBe("partial");
    expect(result.jobs[0]?.sourceKind).toBe("official-api");
    expect(result.cursor?.nextUrl).toBe("/api/v1/feed/next-page");
    expect(ctx.fetcher).toHaveBeenCalledTimes(2);
  });

  it("emits immediate deletion without republishing inactive content", async () => {
    const result = await createNavAdapter().scan(context(read("feed-inactive.json")));
    expect(result.inactiveIds).toEqual(["nav:uuid-1"]);
    expect(result.jobs).toEqual([]);
    expect(JSON.stringify(result)).not.toContain("Old employer");
  });

  it("sends bearer and saved conditional headers", async () => {
    const ctx = context(read("feed-active.json"));
    await createNavAdapter().scan(ctx);
    const init = vi.mocked(ctx.fetcher).mock.calls[0]?.[1];
    const headers = new Headers(init?.headers);
    expect(headers.get("authorization")).toBe("Bearer test-token");
    expect(headers.get("if-none-match")).toBe('"old"');
    expect(headers.get("if-modified-since")).toContain("23 Sep 2026");
  });

  it("reports a missing token as blocked without fetching", async () => {
    const fetcher = vi.fn<typeof fetch>();
    const result = await createNavAdapter().scan({ now, fetcher, env: {} });
    expect(result).toMatchObject({ status: "blocked", diagnosticCode: "missing-nav-token", jobs: [] });
    expect(fetcher).not.toHaveBeenCalled();
  });
});
