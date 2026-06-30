import Link from "next/link";
import type { ProjectStatus } from "@/lib/content";

export function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block rounded-full border border-border px-2.5 py-0.5 text-xs text-muted">
      {children}
    </span>
  );
}

const STATUS_STYLES: Record<ProjectStatus, string> = {
  shipped: "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30",
  "in-progress": "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  planned: "bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border-zinc-500/30",
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
      className="group block rounded-lg border border-border bg-surface p-5 transition-colors hover:border-accent"
    >
      <h3 className="font-semibold tracking-tight group-hover:text-accent transition-colors">{title}</h3>
      {children}
    </Link>
  );
}
