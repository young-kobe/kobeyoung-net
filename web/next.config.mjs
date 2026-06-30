/**
 * Next.js config.
 *
 * - `output: "standalone"` produces a self-contained server bundle for the Docker image
 *   that runs behind Caddy on Hetzner.
 * - Static security headers are set here; the strict, nonce-based Content-Security-Policy
 *   is set per-request in `middleware.ts` (a nonce can't be a static header).
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
  poweredByHeader: false,

  // The code-heavy project writeups (many shiki-highlighted blocks) can approach the
  // default 60s/page static-generation limit when the Docker build runs on the small
  // Hetzner box alongside the model. Give them headroom so the build doesn't flake.
  staticPageGenerationTimeout: 120,

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // HSTS — Caddy/Cloudflare also set this; harmless to reinforce.
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "geolocation=(), microphone=(), camera=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
