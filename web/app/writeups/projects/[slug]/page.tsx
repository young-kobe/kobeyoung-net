import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProjects, getProject, formatDate } from "@/lib/content";
import { BackLink, CardLink, ProjectStatusBadge, StatusBadge, Tag } from "@/components/ui";

export function generateStaticParams() {
  return getProjects().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) return {};
  return {
    title: `${project.name} · Writeups`,
    description: `Writeups and changelog for ${project.name}.`,
  };
}

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) notFound();

  return (
    <div>
      <BackLink href="/writeups">All writeups</BackLink>

      <header className="mt-5 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">{project.name}</h1>
        <ProjectStatusBadge status={project.status} />
      </header>
      <p className="mt-3 font-mono text-xs text-muted">
        {project.writeups.length} writeup{project.writeups.length === 1 ? "" : "s"} · last update{" "}
        {formatDate(project.lastActivity)}
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {project.writeups.map((w) => (
          <CardLink key={w.slug} href={`/writeups/${w.slug}`} title={w.frontmatter.title}>
            <div className="mt-2 flex items-center gap-2">
              <StatusBadge status={w.frontmatter.status} />
              <span className="text-xs text-muted">{formatDate(w.frontmatter.date)}</span>
            </div>
            <p className="mt-3 text-sm text-muted">{w.frontmatter.summary}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {w.frontmatter.tags.map((t) => (
                <Tag key={t}>{t}</Tag>
              ))}
            </div>
          </CardLink>
        ))}
      </div>

      {project.changelog.length > 0 && (
        <details className="mt-8 rounded-lg border border-border bg-surface p-4">
          <summary className="eyebrow cursor-pointer select-none">
            changelog ({project.changelog.length})
          </summary>
          <ul className="mt-3 space-y-1.5">
            {project.changelog.map((c, i) => (
              <li key={i} className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
                <span className="shrink-0 font-mono text-muted">{formatDate(c.date)}</span>
                <span className="min-w-0 flex-1">
                  {c.note}
                  <span className="ml-1 text-muted">({c.writeupTitle})</span>
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
