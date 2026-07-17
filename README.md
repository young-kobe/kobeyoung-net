# kobeyoung.net — portfolio, technical blog, and self-hosted LLM demo

[![CI](https://github.com/young-kobe/kobeyoung-net/actions/workflows/deploy.yml/badge.svg)](https://github.com/young-kobe/kobeyoung-net/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
![Go](https://img.shields.io/badge/Go-stdlib--only-00ADD8.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6.svg)
![Next.js](https://img.shields.io/badge/Next.js-15-000000.svg)
[![Live](https://img.shields.io/badge/live-kobeyoung.net-brightgreen.svg)](https://kobeyoung.net)

A fast, secure personal site: a portfolio + technical blog (MDX, git-as-CMS) with a
live, streaming demo of a self-hosted open-source LLM. The Next.js frontend only ever
talks to a Go backend; all secrets stay server-side.

```
Cloudflare (DNS / proxy / WAF)
        │
      Caddy  (TLS, HSTS, security headers, edge rate-limit)   ← deploy/Caddyfile
        ├── web/   Next.js (App Router, TS, Tailwind, MDX)     :3000
        └── api/   Go backend (stdlib only, zero deps)         :8080
                     ├── POST /contact    spam-protected → Resend email
                     ├── POST /demo/chat  SSE streaming proxy → model
                     ├── GET  /health     backend + model liveness
                     └── model            llama.cpp + Qwen2.5-1.5B (CPU) :9090
packages/contract/   typed API contract shared by web + api
```

## Repository layout

| Path | What |
|---|---|
| `web/` | Next.js frontend. Pages, MDX content, components, CSP middleware. |
| `web/content/` | Projects + blog posts as `.mdx` (git-as-CMS). See `web/content/README.md`. |
| `api/` | Go backend. `cmd/server` (public API) + `cmd/mockmodel` (fast local stand-in; Docker serves the real model via llama.cpp). |
| `packages/contract/api.ts` | Single source of truth for request/response shapes. |
| `deploy/` | `docker-compose.yml` + `Caddyfile` for the self-hosted stack. |

## Quick start (local dev)

Prereqs: Node 22+, Go 1.23+. Two terminals (no Docker needed for dev):

```bash
# 1) Backend + mock model
cd api
cp .env.example .env                 # works as-is for local dev (no Resend key needed yet)
go run ./cmd/mockmodel &             # fake LLM on :9090
go run ./cmd/server                  # API on :8080

# 2) Frontend
cd web
cp .env.example .env.local
npm install
npm run dev                          # http://localhost:3000
```

Visit `http://localhost:3000`. The **Live Demo** streams from the mock model; **Contact**
runs all spam checks but only delivers email once you add a `RESEND_API_KEY` (without one
it validates then returns a friendly "couldn't send" — by design).

### Run the whole stack in Docker

```bash
cd api && cp .env.example .env       # fill in secrets
cd ../deploy && docker compose up --build
# Caddy serves http://localhost (self-signed TLS locally)
```

Unlike `make dev` (which uses the instant Go stand-in), Docker runs the **real model** —
llama.cpp serving **Qwen2.5-1.5B-Instruct (Q4_K_M)**. First boot downloads the GGUF
(~1 GB) into a named volume, so the demo reports "offline" for a minute, then comes online;
later starts are instant. Sized to fit the 4 GB CPX21 alongside the rest of the stack.

## Environment variables

Two `.env` files, deliberately separated so secrets never cross into the browser.

- **`web/.env`** — only `NEXT_PUBLIC_*` (a site URL, the API URL, an optional Turnstile
  *site* key). These are inlined into the client bundle, so **never put a secret here.**
- **`api/.env`** — everything sensitive: `RESEND_API_KEY`, `CONTACT_TO`, the model URL/key,
  rate-limit knobs, `TURNSTILE_SECRET`. See `api/.env.example` for the annotated full list.

## Authoring content

Drop a `.mdx` file into `web/content/projects/` or `web/content/blog/` with valid
frontmatter — that's the whole workflow. Schema and the available MDX components
(`<Callout>`, `<BarChart>`, `<Metrics>`, `<Figure>`, auto-highlighted code blocks) are
documented in **`web/content/README.md`**.

## Security model

Threat model: spam/bot abuse, LLM-demo abuse, secret leakage, XSS. Defenses:

- **Secrets server-side only.** The browser talks to the Go backend; the backend holds the
  Resend key, model URL/key, and Turnstile secret. Nothing sensitive in `NEXT_PUBLIC_*`.
- **Strict CSP** with a per-request nonce (`web/middleware.ts`) — the primary XSS defense —
  plus `frame-ancestors 'none'`, `X-Content-Type-Options`, `Referrer-Policy`,
  `Permissions-Policy`, and HSTS. (Trade-off: the nonce makes top-level pages render
  per-request rather than fully static; content pages are still prerendered/SSG.)
- **Ingress locked to Cloudflare.** Per-IP controls trust `CF-Connecting-IP`, which is only
  sound if the origin can't be reached directly. Enforce with the **Hetzner Cloud Firewall**
  (allow 80/443 only from Cloudflare's IP ranges — a host `ufw` can't, since Docker's
  published ports bypass it) **and** Authenticated Origin Pulls (mTLS, see the
  `Caddyfile`). `TRUST_PROXY_HEADERS` gates this in the app and is safe-by-default off.
- **CORS** is set on the backend, but it's a *browser* control only — `curl`/server-side
  callers send no `Origin` and aren't blocked by it. The real API-abuse defenses are the
  rate limiter + spam checks, not CORS.
- **Contact** (`POST /contact`): honeypot + time-trap + per-IP/global rate limits + strict
  validation (control chars stripped). Emails **you only**, submitter address as `Reply-To`
  only (no open relay). Never stored, never reflected back into a page. The honeypot and
  time-trap are client-forgeable, so **Turnstile is the real bot gate — required in prod.**
- **Demo proxy** (`POST /demo/chat`): click-to-start, per-IP (minute **and** day) + global
  rate limits, hard input/token caps, server-pinned system prompt (client `system` roles
  dropped), bounded+trimmed history, a `DEMO_ENABLED` kill-switch and daily budget cap, and
  a graceful "demo offline" fallback. Turnstile gates it (re-challenged per turn) when enabled.
- **Dependencies:** the Go backend uses the **standard library only** (zero third-party
  deps). The frontend is pinned to exact versions, `npm audit` is clean (`overrides`
  force-patch transitive packages), and Dependabot/`npm audit` should run in CI.

### Cloudflare Turnstile (bot challenge)

Built in but **disabled by default** so local dev needs no keys. To enable before deploy:

1. Create a Turnstile widget in the Cloudflare dashboard → get a **site key** + **secret**.
2. `web/.env`: `NEXT_PUBLIC_TURNSTILE_SITE_KEY=<site key>`
3. `api/.env`: `TURNSTILE_ENABLED=true` and `TURNSTILE_SECRET=<secret>`

No code changes — the widget renders and the backend enforces verification on `/contact`
and `/demo/chat` automatically.

## Swapping in your real inference engine

The Docker stack already serves a real model: **llama.cpp + Qwen2.5-1.5B-Instruct (Q4_K_M)**
on CPU (the `model` service). It's sized for the 4 GB CPX21. To scale up later — e.g. a
GPU host running **vLLM** with Qwen2.5-7B — nothing in the app changes, because every engine
here speaks the same OpenAI-compatible surface (`GET /health`, `POST /v1/chat/completions`
streaming SSE). To swap:

1. Stand up the new engine (bigger llama.cpp box, or `vllm/vllm-openai` on a GPU host with
   `--served-model-name` + `--api-key`).
2. Point the backend at it: set `MODEL_BASE_URL`, `MODEL_NAME` (match `--served-model-name`),
   and `MODEL_API_KEY` if the engine requires auth. For an off-box GPU host, keep it on a
   private network (Tailscale/WireGuard) — never expose the inference port publicly.
3. In `deploy/docker-compose.yml`, drop the local `model` service if the engine runs
   elsewhere. Restart. If your engine streams OpenAI-style `data:` chunks with
   `choices[].delta.content`, **no proxy changes are needed.** If its shape differs, adjust
   the relay loop in `api/internal/llm/llm.go` (the only place that parses upstream chunks).

The typed contract in `packages/contract/api.ts` defines the browser↔backend shapes and
won't change when you swap the model.

## Deploying to Hetzner

1. DNS: add your domain to Cloudflare, point an A record at the Hetzner box, enable the
   orange-cloud proxy. Turn on Bot Fight Mode and a WAF rate-limit rule on `/api/contact`.
2. **Lock ingress to Cloudflare (required).** Create a **Hetzner Cloud Firewall** allowing
   inbound 80/443 only from Cloudflare's published IP ranges, and 22 only from **your own
   IP** (for admin SSH only — deploys are automated and outbound, see
   [CI / Deploy](#ci--deploy)). A host `ufw` won't do — Docker's published ports bypass it,
   so the lock must be at the network edge.
   Optionally also enable Authenticated Origin Pulls (add a `client_auth` stanza to the
   origin-cert `tls` directive in the `Caddyfile` after mounting Cloudflare's origin-pull
   CA). Until the lock is in place, keep `TRUST_PROXY_HEADERS=false`. See SECURITY-AUDIT.md H1.
3. **Enable Turnstile (required for prod).** Put `TURNSTILE_ENABLED=true` + `TURNSTILE_SECRET`
   in `api/.env` (server-side secret); put the public site key as `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
   in `deploy/.env` (compose inlines it into the web build — *not* `web/.env`, which is only
   for local `npm run dev`).
4. On the box: install Docker, clone the repo, and create two env files:
   - `api/.env` — secrets (Resend key, Turnstile secret). `ALLOWED_ORIGINS`,
     `MODEL_BASE_URL`/`MODEL_NAME`, and `TRUST_PROXY_HEADERS` here are **overridden** by
     `docker-compose.yml`, so set those via `deploy/.env` instead.
   - `deploy/.env` — compose interpolation: `SITE_DOMAIN=kobeyoung.net`,
     `NEXT_PUBLIC_SITE_URL=https://kobeyoung.net`, `NEXT_PUBLIC_API_URL=https://kobeyoung.net/api`,
     `NEXT_PUBLIC_TURNSTILE_SITE_KEY=…`, and `TRUST_PROXY_HEADERS` (false until the Cloudflare
     ingress lock from step 2 is in place, then true). `ALLOWED_ORIGINS` is derived from
     `NEXT_PUBLIC_SITE_URL` automatically.
5. **TLS via Cloudflare Origin Certificate.** In Cloudflare → SSL/TLS → Origin Server, create
   an Origin Certificate for `kobeyoung.net, *.kobeyoung.net`; save the cert and key to
   `deploy/cloudflare-origin.pem` and `deploy/cloudflare-origin.key` (git-ignored; mounted
   read-only into Caddy, which serves them via the `tls` directive — no ACME). Set the zone's
   SSL/TLS mode to **Full (strict)**.
6. **Set up pull deploys** (see [CI / Deploy](#ci--deploy)): `docker login ghcr.io` with a
   read-only `read:packages` token so the box can pull the private images. First bring-up:
   `cd deploy && docker compose pull web api && docker compose up -d`; thereafter deploy with
   `git pull --ff-only && bash deploy/deploy.sh` (alias it to `deploy`, see
   [CI / Deploy](#ci--deploy)). The `/api/*` path proxies to the Go backend (SSE buffering
   disabled); everything else to Next.js.

> **Note on streaming:** Caddy is configured with `flush_interval -1` for `/api/*` and the
> backend sends `X-Accel-Buffering: no`, so demo tokens stream without proxy buffering.
> If you front this with a different proxy, disable response buffering on the demo route.

Everything runs on the one Hetzner box via `deploy/docker-compose.yml` — no external host
or platform. The Next.js frontend is containerized (`output: "standalone"`) and served by
Caddy alongside the Go backend, so the whole system is self-hosted on hardware you control.

## CI / Deploy

Deploys are **manual and pull-based** — human-gated, and nothing ever reaches into the box.

On merge to `main`, GitHub Actions (`.github/workflows/deploy.yml`) runs two jobs:

1. **`ci`** (also on PRs): gofmt/`go build`/`go vet`, `next build` (which runs ESLint), `npm audit`.
2. **`build-push`** (main only, after CI): builds the `web` + `api` images and pushes them to
   GHCR — `ghcr.io/young-kobe/kobeyoung-net-{web,api}`, tagged `:latest` and `:sha-<commit>`.

Building in CI keeps builds **off the box** (which is RAM-tight with the model resident). To
ship, you sync the repo and pull the freshly-built images when you're ready:

```bash
ssh kobeyoung                                             # or: ssh -4 root@<box-ip>
cd /opt/kobeyoung-net && git pull --ff-only && bash deploy/deploy.sh
```

`git pull` lands any `docker-compose.yml`/config changes; `deploy/deploy.sh` then does
`docker compose pull web api && up -d` + an image prune. Running the pull first means
`deploy.sh` is always executed fresh — no mid-run self-modification. A failed pull leaves the
running stack untouched, so the live site stays up. For convenience, alias the whole thing on
the box:

```bash
echo "alias deploy='cd /opt/kobeyoung-net && git pull --ff-only && bash deploy/deploy.sh'" >> ~/.bashrc
# then just run:  deploy
```

Every deploy connection is outbound (box → GHCR + your admin SSH), so there's no inbound deploy
path — port 22 stays firewalled to the operator's IP. Secrets (`api/.env`) and the origin cert
(`deploy/cloudflare-origin.*`) are git-ignored and live only on the box, so the `git pull`
never disturbs them.

**Box setup (one-time):** let the box pull the private GHCR images with a read-only token:

```bash
echo "<GHCR_READ_TOKEN>" | docker login ghcr.io -u young-kobe --password-stdin
```

**Rollback:** repin a known-good image in `deploy/docker-compose.yml` (`:latest` → `:sha-<commit>`),
commit, and `deploy` — or on the box, edit the tag and `docker compose pull web api &&
docker compose up -d`.
