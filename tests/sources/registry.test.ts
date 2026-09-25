import { describe, expect, it } from "vitest";
import { getSourceRegistry } from "../../src/sources/registry.js";

describe("source registry", () => {
  it("keeps restricted sources visible as probe-only instead of inventing jobs", () => {
    const registry = getSourceRegistry({ includeRestricted: true });
    expect(registry.find(source => source.id === "indeed")?.mode).toBe("probe-only");
  });

  it("exposes enabled NAV, FINN and configured adapters with unique ids", () => {
    const registry = getSourceRegistry();
    const ids = registry.map(source => source.id);
    expect(ids).toEqual(expect.arrayContaining(["nav", "finn", "adecco", "simona", "soprana"]));
    expect(new Set(ids).size).toBe(ids.length);
  });
});
