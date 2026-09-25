import type { SourceKind, SourceResult } from "../domain/types.js";

export interface SourceContext {
  fetcher: typeof fetch;
  now: () => Date;
  env?: Record<string, string | undefined>;
  cursor?: Record<string, string>;
  maxPages?: number;
}

export interface SourceAdapter {
  readonly id: string;
  readonly kind: SourceKind;
  scan(context: SourceContext): Promise<SourceResult>;
}

export interface RegistrySource {
  id: string;
  kind: SourceKind;
  mode: "enabled" | "probe-only" | "unavailable";
  adapter?: SourceAdapter;
}
