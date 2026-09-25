import { describe, expect, it } from "vitest";
import { applyLifecycle, redactInactiveNav, type LifecycleState } from "../../src/domain/lifecycle.js";
import { normalizeJob } from "../../src/domain/normalize.js";

const now = "2026-09-24T12:00:00.000Z";
const job = { ...normalizeJob({
  sourceId: "nav", sourceJobId: "uuid-1", sourceKind: "official-api",
  url: "https://arbeidsplassen.nav.no/stillinger/stilling/uuid-1",
  title: "Industrial Pipefitter", company: "Old employer", country: "Norway",
  location: "Bergen", description: "private contact content"
}, "2026-09-20T12:00:00.000Z"), status: "active" as const };

const initial: LifecycleState = { jobs: { [job.id]: job }, audit: {} };

describe("job lifecycle", () => {
  it("archives only after three successful absences", () => {
    const missing = (previous: LifecycleState) => applyLifecycle({ current: [], previous, successfulSourceIds: ["nav"], inactiveIds: [], now });
    const state1 = missing(initial);
    const state2 = missing(state1.state);
    const state3 = missing(state2.state);
    expect(state1.jobs[0]?.status).toBe("active");
    expect(state2.jobs[0]?.status).toBe("uncertain");
    expect(state3.jobs[0]?.status).toBe("archived");
  });

  it("does not count a failed source as an absence", () => {
    const result = applyLifecycle({ current: [], previous: initial, successfulSourceIds: [], inactiveIds: [], now });
    expect(result.state.jobs[job.id]?.missingSuccessfulScans).toBe(0);
  });

  it("marks a long-unverified offer uncertain during a prolonged outage", () => {
    const result = applyLifecycle({ current: [], previous: initial, successfulSourceIds: [], inactiveIds: [], now: "2026-10-24T12:00:00.000Z" });
    expect(result.jobs[0]?.status).toBe("uncertain");
  });

  it("removes inactive NAV provenance without deleting a merged employer offer", () => {
    const merged = { ...job, id: "employer:one", sourceId: "employer", sourceJobId: "one", sourceKind: "employer" as const,
      sources: [{ sourceId: "employer", sourceJobId: "one", kind: "employer" as const, url: "https://employer.test/one" }, ...job.sources] };
    const state = { jobs: { [merged.id]: merged }, audit: {} };
    const result = applyLifecycle({ current: [merged], previous: state, successfulSourceIds: ["nav", "employer"], inactiveIds: [job.id], now });
    expect(result.jobs).toHaveLength(1);
    expect(result.jobs[0]?.sources.some(source => source.sourceId === "nav")).toBe(false);
  });

  it("removes explicit NAV inactivity and retains audit metadata only", () => {
    const result = applyLifecycle({ current: [], previous: initial, successfulSourceIds: ["nav"], inactiveIds: [job.id], now });
    expect(result.jobs).toHaveLength(0);
    expect(result.state.jobs[job.id]).toBeUndefined();
    expect(result.state.audit[job.id]).toEqual(redactInactiveNav(job, now));
    expect(JSON.stringify(result.state.audit[job.id])).not.toContain("Old employer");
    expect(JSON.stringify(result.state.audit[job.id])).not.toContain("private contact content");
  });
});
