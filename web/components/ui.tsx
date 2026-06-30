import Link from "next/link";
import type { ProjectStatus } from "@/lib/content";

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
      <SectionLabel>{eyebrow}</SectionLabel>
      <h1 className="mt-4 font-display text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
      {lead && <p className="mt-3 max-w-2xl text-muted">{lead}</p>}
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

export function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block rounded-full border border-border px-2.5 py-0.5 font-mono text-[0.7rem] text-muted">
      {children}
    </span>
  );
}

const STATUS_STYLES: Record<ProjectStatus, string> = {
  shipped: "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30",
  "in-progress": "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  planned: "bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border-zinc-500/30",
  paused: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
};

export function StatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[status]}`}>
      {status.replace("-", " ")}
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
      className="group block rounded-lg border border-border bg-surface p-5 transition-all duration-200 hover:-translate-y-1 hover:border-accent hover:shadow-[0_0_0_1px_rgb(var(--accent)/0.4),0_12px_30px_-12px_rgb(var(--accent)/0.35)] motion-reduce:transform-none motion-reduce:transition-none"
    >
      <h3 className="font-display font-bold tracking-tight transition-colors group-hover:text-accent">
        {title}
      </h3>
      {children}
    </Link>
  );
}
