"use client";

import { type ElementType, useEffect, useState } from "react";

/** Reusable "decode" effect: streams `text` in token-by-token with a caret on
 *  mount, like the model generating it. SSR renders the full string (and it's the
 *  element's aria-label), so SEO, screen readers, and no-JS all get real text;
 *  only motion-enabled clients re-run the animation. */
export function DecodeText({
  text,
  as,
  className = "",
  speed = 80,
  startDelay = 0,
}: {
  text: string;
  as?: ElementType;
  className?: string;
  speed?: number;
  startDelay?: number;
}) {
  const Tag = as ?? "span";
  const tokens = text.split(" ");
  // Start fully revealed so SSR === first client render (no hydration mismatch).
  const [shown, setShown] = useState(tokens.length);
  const [done, setDone] = useState(true);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setShown(0);
    setDone(false);
    let i = 0;
    let interval: ReturnType<typeof setInterval> | undefined;
    const begin = setTimeout(() => {
      interval = setInterval(() => {
        i += 1;
        setShown(i);
        if (i >= tokens.length) {
          clearInterval(interval);
          setDone(true);
        }
      }, speed);
    }, startDelay);
    return () => {
      clearTimeout(begin);
      if (interval) clearInterval(interval);
    };
    // Re-run only if the source text changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  return (
    <Tag className={className} aria-label={text}>
      <span aria-hidden="true">
        {tokens.slice(0, shown).join(" ")}
        {!done && <span className="caret">▋</span>}
      </span>
    </Tag>
  );
}
