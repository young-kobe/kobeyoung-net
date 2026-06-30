import Link from "next/link";
import { site } from "@/lib/site";
import { ThemeToggle } from "./ThemeToggle";
import { MobileMenu } from "./MobileMenu";

export function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/80 backdrop-blur">
      <nav className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        <Link
          href="/"
          aria-label={`${site.name} — home`}
          className="group inline-flex items-baseline font-display text-base font-bold tracking-tight"
        >
          <span className="transition-colors group-hover:text-accent">kobe young</span>
          <span aria-hidden="true" className="ml-0.5 text-accent2">
            _
          </span>
        </Link>
        <div className="flex items-center gap-1 sm:gap-2">
          <div className="hidden items-center gap-1 sm:flex sm:gap-2">
            {site.nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-2.5 py-1.5 font-mono text-[0.8rem] text-muted transition-colors hover:bg-surface hover:text-fg"
              >
                {item.label}
              </Link>
            ))}
          </div>
          <ThemeToggle />
          <MobileMenu />
        </div>
      </nav>
    </header>
  );
}
