"use client";

import { useEffect, useState } from "react";

/** Signature element: the headline decodes token-by-token on load, like the model
 *  Kobe builds generating it. SSR renders the full line (SEO + no-JS), and screen
 *  readers get it via aria-label; only motion-enabled clients re-run the decode.
 *  Reduced-motion users keep the static line. */
const HEADLINE = "Real-time data pipelines, LLM serving, and the systems underneath.";
const TOKENS = HEADLINE.split(" ");

export function HeroHeadline({ className = "" }: { className?: string }) {
  // Start fully revealed so SSR === first client render (no hydration mismatch).
  const [shown, setShown] = useState(TOKENS.length);
  const [done, setDone] = useState(true);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setShown(0);
    setDone(false);
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setShown(i);
      if (i >= TOKENS.length) {
        clearInterval(id);
        setDone(true);
      }
    }, 85);
    return () => clearInterval(id);
  }, []);

  return (
    <h1 className={className} aria-label={HEADLINE}>
      <span aria-hidden="true">
        {TOKENS.slice(0, shown).join(" ")}
        {!done && <span className="caret">▋</span>}
      </span>
    </h1>
  );
}
