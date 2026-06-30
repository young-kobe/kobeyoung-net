"use client";

import { useEffect, useRef, useState } from "react";

/** Quiet scroll-triggered reveal. Content renders normally on the server and for
 *  no-JS clients (the `.reveal` hidden state is only applied after mount, and a
 *  <noscript> rule in the layout forces it visible regardless). Reduced-motion
 *  clients skip the animation. */
export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    setMounted(true);
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Before mount: no class → fully visible (SSR / no-JS safe).
  const state = !mounted ? "" : seen ? "reveal is-in" : "reveal";

  return (
    <div
      ref={ref}
      className={`${state} ${className}`.trim()}
      style={delay && mounted && !seen ? { animationDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
