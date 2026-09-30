import { createConfiguredPageAdapters } from "./configured-pages.js";
import { createFinnAdapter } from "./finn.js";
import { createNavAdapter } from "./nav.js";
import { createJobtechAdapter } from "./jobtech.js";
import { createEuropeanPageAdapters } from "./europe-pages.js";
import type { RegistrySource } from "./types.js";

export function getSourceRegistry(options: { includeRestricted?: boolean } = {}): RegistrySource[] {
  const enabled: RegistrySource[] = [createNavAdapter(), createFinnAdapter(), ...createConfiguredPageAdapters(), createJobtechAdapter(), ...createEuropeanPageAdapters()]
    .map(adapter => ({ id: adapter.id, kind: adapter.kind, mode: "enabled", adapter }));
  if (!options.includeRestricted) return enabled;
  return [
    ...enabled,
    { id: "indeed", kind: "aggregator", mode: "probe-only" },
    { id: "jobs-pl", kind: "portal", mode: "unavailable" },
    { id: "poloniusz", kind: "portal", mode: "unavailable" }
  ];
}
