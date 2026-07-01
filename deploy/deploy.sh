#!/usr/bin/env bash
# Box-side deploy step (compose pull + restart). Run it manually after syncing the repo:
#   cd /opt/kobeyoung-net && git pull --ff-only && bash deploy/deploy.sh   (aliased to `deploy`)
# Pulling first means this script always runs fresh (no mid-run self-modification). Human-gated
# — see README "CI / Deploy". Kept in git so the procedure is versioned.
#
# Pull-based: the web/api images are built + pushed to GHCR by CI, so the box only pulls and
# restarts — it never builds. A no-op when nothing changed. A failed pull leaves the running
# stack untouched.
#
# Pull ONLY our own images — pulling all services would also re-check the moving third-party
# tags (caddy:2-alpine, llama.cpp:server) and could auto-update/restart them unexpectedly.
# `up -d` uses pull_policy: missing, so those base images stay put unless absent.
set -euo pipefail

cd "$(dirname "$0")" # -> deploy/  (compose reads ./ .env and ../api/.env from here)

docker compose pull web api
docker compose up -d --remove-orphans
docker image prune -f
