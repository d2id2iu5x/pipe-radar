import { describe, expect, it, vi } from "vitest";
import { scheduleHandler } from "../../netlify/functions/scan-schedule.js";

describe("scheduled scan trigger", () => {
  it("runs the production scan directly without requiring a trigger token", async () => {
    const run = vi.fn(async () => ({ published: true }));
    const response = await scheduleHandler(new Request("https://site.test/.netlify/functions/scan-schedule"), {} as never, { run });
    expect(response.status).toBe(202);
    expect(run).toHaveBeenCalledOnce();
    await expect(response.json()).resolves.toEqual({ accepted: true, published: true });
  });
});
