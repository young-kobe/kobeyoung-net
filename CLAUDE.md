# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> General working rules live in `~/.claude/CLAUDE.md` (apply across all projects). This file
> is repo-specific only.

# Repository

Monorepo for a portfolio + technical blog + live self-hosted LLM demo. Self-hosted on a
Hetzner box behind Caddy + Cloudflare — **not Vercel**.

- `web/` — Next.js 15 (App Router, TypeScript, Tailwind). MDX files are the CMS.
- `api/` — Go backend, **standard library only (zero third-party deps), by design.**
- `packages/contract/api.ts` — single source of truth for browser↔backend request/response
  shapes. Change a wire shape here first; `web` imports it via the `@contract/*` alias, `api`
  mirrors it structurally.
- `deploy/` — `docker-compose.yml` + `Caddyfile` for the whole stack.

## Commands

Run from the repo root (`make help` lists everything):

- `make setup` — create `.env` files + install deps (first time)
- `make dev` — mock model (:9090) + Go API (:8080) + Next.js (:3000) together
- `make dev-model` — run the real model locally (llama.cpp + Qwen2.5-1.5B) instead of the mock
- `make build` — Go binaries + `next build`
- `make fmt` / `make vet` / `make audit` — gofmt, `go vet`, `npm audit`

Go: `cd api && go build ./... && go vet ./...`; format with `gofmt -w .`.
Web: `cd web && npm run dev | build | lint`.

**No automated test suite yet.** Verify by building and running (`make dev`) and exercising
endpoints directly (`/health`, the SSE demo stream, the contact spam traps).

## Architecture (the parts that span files)

- **The browser only ever talks to the Go backend.** Every secret (Resend key, model URL/key,
  Turnstile secret) lives in `api`'s env, never in `NEXT_PUBLIC_*`. Load-bearing — do not route
  the browser to any third party.
- **Backend wiring:** `api/cmd/server/main.go` loads config, builds two rate limiters (contact,
  demo), and mounts three handlers through a middleware chain (Recover → SecurityHeaders →
  CORS). Config comes from env via `internal/config` (with an optional dev `.env` loader).
- **LLM demo proxy** (`internal/llm/llm.go`) relays an upstream OpenAI-style streaming
  `/v1/chat/completions` to the browser as simplified SSE events. Swapping models = change
  `MODEL_BASE_URL` only; `llm.go` is the *only* place that parses upstream chunk shape. Docker
  serves llama.cpp + Qwen2.5-1.5B; local `make dev` uses the Go `cmd/mockmodel` stand-in.
- **Abuse defenses are layered, not single-point:** in-memory per-IP + global rate limiting
  (`internal/ratelimit`), honeypot + time-trap + Turnstile on contact, kill-switch + token/input
  caps on the demo. Per-IP keys come from `middleware.ClientIP`, which trusts
  `CF-Connecting-IP`/`X-Forwarded-For` only when `TRUST_PROXY_HEADERS=true` — sound only once
  ingress is Cloudflare-locked (Hetzner Cloud Firewall — not ufw, which Docker bypasses — plus
  Authenticated Origin Pulls).
- **Frontend security:** `web/middleware.ts` sets a strict per-request **nonce CSP**. Side
  effect: top-level pages render per-request (not fully static); MDX content pages stay SSG.
  `style-src 'unsafe-inline'` is the one deliberate relaxation (Tailwind).
- **Content is git-as-CMS:** MDX in `web/content/{projects,blog}` with YAML frontmatter,
  validated at build by `web/lib/content.ts` (malformed file → failed build). **MDX is
  trusted-author input only — never render user-submitted text through it.**

## Conventions / gotchas

- `api` is **zero-dependency on purpose** — don't add Go modules; reach for stdlib.
- Frontend deps are pinned to exact versions with `overrides` to force-patch transitives; keep
  `npm audit` clean.
- `web/.env` holds **only** `NEXT_PUBLIC_*` (inlined into the client bundle) — never a secret.
- `SECURITY-AUDIT.md` at root is the working security notes; consult it before touching
  auth / rate-limit / client-IP / CSP code.
