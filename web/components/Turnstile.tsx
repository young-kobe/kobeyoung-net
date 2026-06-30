"use client";

import Script from "next/script";
import { useEffect, useRef } from "react";

/**
 * Cloudflare Turnstile widget — the client half of the bot-challenge seam.
 *
 * Renders only when NEXT_PUBLIC_TURNSTILE_SITE_KEY is set; otherwise it renders nothing
 * and `onToken` is never called (local dev with TURNSTILE_ENABLED=false on the backend).
 * To enable: set the site key here and TURNSTILE_ENABLED=true + TURNSTILE_SECRET on the API.
 */
declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      reset: (id?: string) => void;
    };
    onTurnstileLoad?: () => void;
  }
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

/**
 * @param onToken    called with a fresh token on solve, and "" on error/expiry/reset.
 * @param resetSignal bump this number to force a new challenge (tokens are single-use, so
 *                    the demo resets the widget after every message turn — see DemoChat).
 */
export function Turnstile({
  onToken,
  resetSignal = 0,
}: {
  onToken: (token: string) => void;
  resetSignal?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);

  useEffect(() => {
    if (!SITE_KEY) return;
    function render() {
      if (ref.current && window.turnstile && widgetId.current === null) {
        widgetId.current = window.turnstile.render(ref.current, {
          sitekey: SITE_KEY,
          callback: (token: string) => onToken(token),
          "error-callback": () => onToken(""),
          "expired-callback": () => onToken(""),
        });
      }
    }
    window.onTurnstileLoad = render;
    render(); // in case the script already loaded
  }, [onToken]);

  // Tokens are single-use: after each send, the parent bumps resetSignal to re-challenge.
  // Cloudflare's managed widget re-solves invisibly, then fires `callback` with a new token.
  useEffect(() => {
    if (resetSignal > 0 && widgetId.current !== null && window.turnstile) {
      onToken(""); // invalidate the spent token until the new one arrives
      window.turnstile.reset(widgetId.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetSignal]);

  if (!SITE_KEY) return null;

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad"
        strategy="afterInteractive"
      />
      <div ref={ref} className="my-2" />
    </>
  );
}

/** True when Turnstile is configured client-side (so forms know to require a token). */
export const turnstileEnabled = Boolean(SITE_KEY);
