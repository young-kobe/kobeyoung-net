import { NextRequest, NextResponse } from "next/server";

/**
 * Per-request strict Content-Security-Policy with a fresh nonce — the primary XSS
 * defense. A nonce can't live in a static header, so it's generated here and threaded
 * into the response; Next.js automatically applies the nonce to its own inline scripts.
 *
 * Allowances:
 *   - script/style: 'self' + nonce. 'strict-dynamic' lets nonce'd scripts load chunks.
 *   - connect-src: 'self' + the Go backend (NEXT_PUBLIC_API_URL) for fetch/SSE.
 *   - Cloudflare Turnstile: script + frame from challenges.cloudflare.com.
 *   - img/font: 'self' + data: (inline SVG/fonts).
 */
export function middleware(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
  const turnstile = "https://challenges.cloudflare.com";

  const csp = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ${turnstile}`,
    `style-src 'self' 'unsafe-inline'`, // Tailwind/Next inject style tags; scoped to styles only
    `img-src 'self' data: blob:`,
    `font-src 'self' data:`,
    `connect-src 'self' ${apiUrl}`.trim(),
    `frame-src ${turnstile}`,
    `frame-ancestors 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `object-src 'none'`,
    `upgrade-insecure-requests`,
  ].join("; ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  // Apply to all routes except static assets and image optimizer.
  matcher: [
    {
      source: "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
    },
  ],
};
