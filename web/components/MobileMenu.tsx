"use client";

import { useState } from "react";
import Link from "next/link";
import { site } from "@/lib/site";

/** Small-screen nav: a hamburger that discloses the links in a panel below the
 *  header. Hidden at >=sm, where the inline links take over (see Nav). */
export function MobileMenu() {
  const [open, setOpen] = useState(false);

  return (
    <div className="sm:hidden">
      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="rounded-md border border-border p-2 text-muted transition-colors hover:border-accent hover:text-fg"
      >
        {open ? <CloseIcon /> : <MenuIcon />}
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full border-b border-border bg-bg/95 backdrop-blur">
          <div className="mx-auto flex max-w-5xl flex-col px-4 py-2">
            {site.nav.map((item) =>
              item.external ? (
                <a
                  key={item.href}
                  href={item.href}
                  target="_blank"
                  rel="noopener"
                  onClick={() => setOpen(false)}
                  className="rounded-md px-2 py-3 font-mono text-sm text-accent transition-colors hover:bg-surface"
                >
                  {item.label}
                </a>
              ) : (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="rounded-md px-2 py-3 font-mono text-sm text-muted transition-colors hover:bg-surface hover:text-fg"
                >
                  {item.label}
                </Link>
              ),
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function MenuIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M3 6h18M3 12h18M3 18h18" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}
