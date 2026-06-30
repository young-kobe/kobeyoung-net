#!/usr/bin/env bash
# Lock origin ingress to Cloudflare (SECURITY-AUDIT.md H1).
#
# The Go backend trusts CF-Connecting-IP for per-IP rate limiting. That is only sound if
# the box cannot be reached on 80/443 except through Cloudflare. This script configures
# ufw to allow HTTP/HTTPS ONLY from Cloudflare's published IP ranges (IPv4 + IPv6), so a
# direct-to-IP attacker can't bypass the WAF or spoof CF-Connecting-IP.
#
# Run on the Hetzner box as root:  sudo bash deploy/cloudflare-firewall.sh
# Re-run whenever Cloudflare updates its ranges (rare). Pair with Authenticated Origin
# Pulls in the Caddyfile for defense in depth.
#
# Prefer Hetzner Cloud Firewall (applied at the network edge, before the host) if available
# — same allowlist, even better. This script is the host-level fallback.
set -euo pipefail

if [[ $EUID -ne 0 ]]; then
	echo "Run as root (sudo)." >&2
	exit 1
fi

if ! command -v ufw >/dev/null 2>&1; then
	echo "ufw not found. Install it (apt-get install -y ufw) or use the Hetzner Cloud Firewall." >&2
	exit 1
fi

echo "Fetching Cloudflare IP ranges…"
V4="$(curl -fsS https://www.cloudflare.com/ips-v4)"
V6="$(curl -fsS https://www.cloudflare.com/ips-v6)"

if [[ -z "$V4" || -z "$V6" ]]; then
	echo "Failed to fetch Cloudflare ranges; aborting (leaving firewall unchanged)." >&2
	exit 1
fi

echo "Resetting ufw rules…"
ufw --force reset
ufw default deny incoming
ufw default allow outgoing

# Keep SSH reachable (adjust the port if you moved it).
ufw allow 22/tcp comment 'SSH'

# Allow HTTP/HTTPS ONLY from Cloudflare.
while read -r cidr; do
	[[ -n "$cidr" ]] || continue
	ufw allow from "$cidr" to any port 80 proto tcp comment 'Cloudflare HTTP'
	ufw allow from "$cidr" to any port 443 proto tcp comment 'Cloudflare HTTPS'
done <<<"$V4"$'\n'"$V6"

ufw --force enable
echo
echo "Done. 80/443 now reachable only from Cloudflare. Verify with: ufw status numbered"
echo "Reminder: set TRUST_PROXY_HEADERS=true only now that ingress is Cloudflare-locked."
