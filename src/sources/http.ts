export type FetchStatus = "success" | "blocked" | "failed";

export interface FetchSourceRequest {
  url: string;
  fetcher?: typeof fetch;
  timeoutMs: number;
  headers?: HeadersInit;
}

export interface ClassifiedResponse {
  status: FetchStatus;
  httpStatus: number | null;
  body: string;
  headers: Headers;
  diagnosticCode?: string;
  attempts: number;
}

const RETRYABLE = new Set([429, 502, 503, 504]);
const BLOCKED_TEXT = /captcha|verify you are human|access denied|cloudflare|sign in to continue|logg inn for å fortsette/i;

function delay(milliseconds: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

function timeoutLike(error: unknown): boolean {
  return error instanceof Error && ["AbortError", "TimeoutError"].includes(error.name);
}

export async function fetchSource(request: FetchSourceRequest): Promise<ClassifiedResponse> {
  const fetcher = request.fetcher ?? fetch;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const headers = new Headers(request.headers);
      if (!headers.has("Accept")) headers.set("Accept", "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8");
      if (!headers.has("User-Agent")) headers.set("User-Agent", "PIPE RADAR/2.4 (+https://pipe-radar.netlify.app/; compliant job availability monitor)");
      const response = await fetcher(request.url, { headers, signal: AbortSignal.timeout(request.timeoutMs) });
      const body = await response.text();
      if (BLOCKED_TEXT.test(body) || [401, 403].includes(response.status)) {
        return { status: "blocked", httpStatus: response.status, body: "", headers: response.headers, diagnosticCode: "access-blocked", attempts: attempt };
      }
      if (response.ok) return { status: "success", httpStatus: response.status, body, headers: response.headers, attempts: attempt };
      if (attempt === 1 && RETRYABLE.has(response.status)) {
        const retryAfter = Number(response.headers.get("retry-after") ?? "0");
        if (Number.isFinite(retryAfter) && retryAfter > 0) await delay(Math.min(retryAfter * 1000, 5000));
        continue;
      }
      return { status: "failed", httpStatus: response.status, body: "", headers: response.headers, diagnosticCode: `http-${response.status}`, attempts: attempt };
    } catch (error) {
      const timeout = timeoutLike(error);
      if (attempt === 1 && timeout) continue;
      return { status: "failed", httpStatus: null, body: "", headers: new Headers(), diagnosticCode: timeout ? "timeout" : "network-error", attempts: attempt };
    }
  }
  return { status: "failed", httpStatus: null, body: "", headers: new Headers(), diagnosticCode: "retry-exhausted", attempts: 2 };
}
