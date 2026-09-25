import { describe, expect, it } from "vitest";
import { bootJobData } from "../../src/client/remote-data.js";

describe("remote boot storage regression", () => {
  it("does not overwrite corrupt or concurrently changed saved state during boot", async () => {
    localStorage.setItem("pipe-radar-saved-v2", "{broken");
    await bootJobData({
      fetcher: async () => new Response("not-json"),
      fallback: [{ id: "seed" }],
      timeoutMs: 100,
      apply: () => localStorage.setItem("unrelated", "rendered")
    });
    expect(localStorage.getItem("pipe-radar-saved-v2")).toBe("{broken");
  });
});
