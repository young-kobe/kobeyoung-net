/**
 * Typed API contract between the Next.js frontend (`web/`) and the Go backend (`api/`).
 *
 * This file is the single source of truth for request/response shapes. The Go side
 * mirrors these structs in `api/internal/*` — keep them in sync when changing a shape.
 *
 * The browser ONLY ever talks to the Go backend (never to Resend, the model, or any
 * third-party API directly). No secrets appear in any type here.
 */

// ---------------------------------------------------------------------------
// POST /contact
// ---------------------------------------------------------------------------

export interface ContactRequest {
  /** Sender's name. Trimmed, 1–100 chars. */
  name: string;
  /** Sender's email. Used only as Reply-To on the email sent to the site owner. */
  email: string;
  /** Message body. Trimmed, 1–5000 chars. */
  message: string;
  /**
   * Honeypot field. Real users never see or fill this (hidden via CSS).
   * If non-empty, the server silently drops the submission (still returns 200).
   */
  company?: string;
  /**
   * Unix milliseconds when the form was rendered. The server rejects submissions
   * faster than ~2s (bots) or older than ~2h (stale/replayed).
   */
  renderedAt: number;
  /** Cloudflare Turnstile token. Required only when Turnstile is enabled server-side. */
  turnstileToken?: string;
}

export interface ContactResponse {
  ok: boolean;
  /** Human-readable message; safe to display. Never echoes submitted content. */
  message: string;
}

// ---------------------------------------------------------------------------
// POST /chat  (Server-Sent Events stream — see notes below)
// ---------------------------------------------------------------------------

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  /** Cloudflare Turnstile token, gathered at click-to-start. */
  turnstileToken?: string;
}

// ---------------------------------------------------------------------------
// POST /gateway  and  GET /gateway/health
// ---------------------------------------------------------------------------
// The second live chat routes through the ts-llm-gateway project (OpenAI-compatible surface)
// to AWS Bedrock. It reuses the exact wire shapes above — `ChatRequest` in, an SSE stream of
// `ChatStreamEvent` out, and `HealthResponse` for GET /gateway/health — so no new chat types
// are needed. Its own kill-switch + tighter rate/budget caps live server-side.

/**
 * Generation metrics for one response, measured server-side by the proxy and delivered
 * on the terminating `done` event. Lets the UI surface how the self-hosted model actually
 * performed (time-to-first-token, decode throughput) rather than hiding it.
 */
export interface StreamStats {
  /** Completion tokens streamed (one per upstream delta). */
  tokens: number;
  /** Time to first token in ms — model queue + prefill, measured from the upstream request. */
  ttftMs: number;
  /** Decode throughput in tokens/sec (tokens after the first, over the decode window). */
  tokPerSec: number;
}

/**
 * The /chat endpoint responds with `text/event-stream`.
 * Each SSE `data:` line carries one JSON-encoded `ChatStreamEvent`.
 * The stream terminates with a literal `data: [DONE]` line (OpenAI-style).
 */
export type ChatStreamEvent =
  | { type: "token"; token: string }
  | { type: "error"; message: string }
  | { type: "done"; stats?: StreamStats };

// ---------------------------------------------------------------------------
// GET /health
// ---------------------------------------------------------------------------

export interface HealthResponse {
  /** Backend itself is up. */
  ok: boolean;
  /** Whether the upstream model backend is reachable — drives the demo online/offline UI. */
  model: "online" | "offline";
  /** Model display name, when known. */
  modelName?: string;
  /** Parameter count, e.g. "1.5B" — for the demo's model card. Present only when online. */
  modelParams?: string;
  /** Quantization, e.g. "Q4_K_M" — for the demo's model card. Present only when online. */
  modelQuant?: string;
}

// ---------------------------------------------------------------------------
// GET /stats  (live dashboard snapshot)
// ---------------------------------------------------------------------------

/**
 * A point-in-time snapshot of the self-hosted stack, polled by the home-page dashboard.
 * All counters are in-memory and reset on deploy ("since last deploy"); host figures come
 * from the box's /proc. Every field is public by design — the dashboard's whole purpose is
 * to show the self-hosted stack working. No secrets appear here.
 */
export interface StatsResponse {
  model: {
    online: boolean;
    name: string;
    params: string;
    quant: string;
  };
  generation: {
    /** Most recent response's decode throughput (tokens/sec); 0 before the first response. */
    lastTokPerSec: number;
    /** Most recent response's time-to-first-token (ms). */
    lastTtftMs: number;
    totalResponses: number;
    totalTokens: number;
    /** Global demo responses used against today's budget, and the cap. */
    responsesToday: number;
    dailyCap: number;
  };
  host: {
    cpuPct: number;
    memUsedPct: number;
    load1: number;
    cores: number;
    uptimeSec: number;
  };
  site: {
    /** API process uptime in seconds. */
    uptimeSec: number;
    requests: { total: number; chat: number; contact: number; health: number };
    /** Abuse deflected, counted where each defense fires. */
    abuse: { honeypot: number; rateLimited: number; turnstileFailed: number };
    contactSent: number;
  };
}

// ---------------------------------------------------------------------------
// GET /gateway/stats  (ts-llm-gateway live counters, proxied through this backend)
// ---------------------------------------------------------------------------

/**
 * The ts-llm-gateway's own live counters, relayed verbatim by the Go backend so the browser
 * never calls Vercel directly. Shape mirrors the gateway's public GET /stats. All fields are
 * public by design.
 */
export interface GatewayStats {
  uptimeMs: number;
  requests: number;
  success: number;
  errors: number;
  rejected: {
    rate_limited: number;
    unauthorized: number;
    payload_too_large: number;
    invalid_request: number;
    model_not_allowed: number;
  };
  cache: { hits: number; misses: number; hitRate: number };
  failovers: number;
  byProvider: { bedrock: number; openai: number };
  tokens: { input: number; output: number };
  latencyMs: { count: number; p50: number; p99: number };
}

/**
 * Envelope from GET /gateway/stats. `online` is false when the gateway demo is disabled or
 * the upstream fetch failed; `stats` is present only when `online` is true.
 */
export interface GatewayStatsResponse {
  online: boolean;
  stats?: GatewayStats;
}
