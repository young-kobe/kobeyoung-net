import Link from "next/link";
import type { ProjectStatus, WriteupStatus } from "@/lib/content";
import { DecodeText } from "./DecodeText";

/** Mono eyebrow over a hairline rule — the recurring "data voice" label. */
export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="eyebrow">{children}</span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

/** Standard page header: mono eyebrow + hairline, display title, optional lead. */
export function PageHeader({
  eyebrow,
  title,
  lead,
}: {
  eyebrow: string;
  title: string;
  lead?: React.ReactNode;
}) {
  return (
    <header>
      <div className="animate-rise">
        <SectionLabel>{eyebrow}</SectionLabel>
      </div>
      <div className="mt-4 animate-rise" style={{ animationDelay: "80ms" }}>
        <DecodeText
          as="h1"
          text={title}
          startDelay={140}
          speed={70}
          className="text-balance font-display text-3xl font-bold tracking-tight sm:text-4xl"
        />
      </div>
      {lead && (
        <p className="mt-3 max-w-2xl text-muted animate-rise" style={{ animationDelay: "180ms" }}>
          {lead}
        </p>
      )}
    </header>
  );
}

/** Mono back-link used at the top of detail pages. */
export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="font-mono text-xs text-muted transition-colors hover:text-accent">
      {children}
    </Link>
  );
}

/** Four corner registration ticks — the recurring "instrument" motif that replaces plain
 *  rounded-box chrome. Non-interactive overlay; color/opacity can be driven by the parent. */
export function CornerTicks({ className = "" }: { className?: string }) {
  const c = "pointer-events-none absolute h-2 w-2 border-accent/60";
  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 ${className}`}>
      <span className={`${c} left-0 top-0 border-l border-t`} />
      <span className={`${c} right-0 top-0 border-r border-t`} />
      <span className={`${c} bottom-0 left-0 border-b border-l`} />
      <span className={`${c} bottom-0 right-0 border-b border-r`} />
    </div>
  );
}

/** Framed "instrument" surface: hairline border, corner ticks, no radius. The house style for
 *  any panel that holds a readout or a chart — deliberately not a rounded card. */
export function InstrumentFrame({
  title,
  badge,
  footnote,
  className = "",
  children,
}: {
  title?: React.ReactNode;
  badge?: React.ReactNode;
  footnote?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <figure className={`relative border border-border bg-surface/70 p-4 sm:p-5 ${className}`}>
      <CornerTicks />
      {(title || badge) && (
        <figcaption className="mb-4 flex items-baseline justify-between gap-3">
          {title && <span className="text-sm font-medium">{title}</span>}
          {badge && <span className="eyebrow shrink-0">{badge}</span>}
        </figcaption>
      )}
      {children}
      {footnote && <div className="mt-3 text-xs leading-relaxed text-muted">{footnote}</div>}
    </figure>
  );
}

export function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block rounded-full border border-border px-2.5 py-0.5 font-mono text-[0.7rem] text-muted">
      {children}
    </span>
  );
}

const STATUS_STYLES: Record<WriteupStatus, string> = {
  shipped: "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30",
  "in-progress": "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  planned: "bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border-zinc-500/30",
  paused: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
};

export function StatusBadge({ status }: { status: WriteupStatus }) {
  return (
    <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[status]}`}>
      {status.replace("-", " ")}
    </span>
  );
}

const PROJECT_STATUS_STYLES: Record<ProjectStatus, string> = {
  ongoing: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  paused: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
  shipped: "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30",
  planned: "bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border-zinc-500/30",
};

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${PROJECT_STATUS_STYLES[status]}`}>
      {status}
    </span>
  );
}

export function CardLink({
  href,
  title,
  children,
}: {
  href: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group relative block border border-border bg-surface/70 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/60 hover:shadow-[0_10px_30px_-16px_rgb(var(--accent)/0.4)] motion-reduce:transform-none motion-reduce:transition-none"
    >
      <CornerTicks className="opacity-30 transition-opacity duration-200 group-hover:opacity-100" />
      <h3 className="font-display font-bold tracking-tight transition-colors group-hover:text-accent">
        {title}
      </h3>
      {children}
    </Link>
  );
}
