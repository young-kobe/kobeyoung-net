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

/**
 * The /chat endpoint responds with `text/event-stream`.
 * Each SSE `data:` line carries one JSON-encoded `ChatStreamEvent`.
 * The stream terminates with a literal `data: [DONE]` line (OpenAI-style).
 */
export type ChatStreamEvent =
  | { type: "token"; token: string }
  | { type: "error"; message: string }
  | { type: "done" };

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
}
