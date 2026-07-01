#!/usr/bin/env bash
# Box-side deploy step, run by CI on push to main.
#
# The CI SSH key is locked (forced command) to a small stable launcher at
# /root/ci-deploy.sh that has ALREADY fetched origin and hard-reset the repo to
# origin/main before exec'ing this script. Keeping the build/restart logic here (in
# git) means the deploy procedure is versioned; the launcher stays tiny and stable so
# it never rewrites itself mid-run.
#
# Build-on-box: `docker compose up --build` rebuilds images then recreates containers.
# If a build fails the command errors out and the currently-running stack is left
# untouched — the live site stays up on the old containers.
set -euo pipefail

cd "$(dirname "$0")" # -> deploy/  (compose reads ./ .env and ../api/.env from here)

docker compose up --build -d --remove-orphans
docker image prune -f
