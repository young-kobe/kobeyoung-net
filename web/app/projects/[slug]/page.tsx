import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getProject, getProjects, formatDate } from "@/lib/content";
import { MdxContent } from "@/components/MdxContent";
import { StatusBadge, Tag } from "@/components/ui";

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
  const { title, summary, hero } = project.frontmatter;
  return {
    title,
    description: summary,
    openGraph: { title, description: summary, type: "article", images: hero ? [hero] : undefined },
  };
}

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) notFound();
  const fm = project.frontmatter;

  return (
    <article>
      <Link href="/projects" className="text-sm text-accent hover:underline">← All projects</Link>

      <header className="mt-4">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">{fm.title}</h1>
          <StatusBadge status={fm.status} />
        </div>
        <p className="mt-3 text-lg text-muted">{fm.summary}</p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {fm.tags.map((t) => (
            <Tag key={t}>{t}</Tag>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          {fm.repo && (
            <a href={fm.repo} className="text-accent hover:underline" target="_blank" rel="noopener noreferrer">
              Repository ↗
            </a>
          )}
          {fm.demo && (
            <a href={fm.demo} className="text-accent hover:underline" target="_blank" rel="noopener noreferrer">
              Live demo ↗
            </a>
          )}
        </div>
      </header>

      {fm.updates && fm.updates.length > 0 && (
        <section className="mt-8 rounded-lg border border-border bg-surface p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Update log</h2>
          <ul className="mt-3 space-y-2">
            {fm.updates.map((u, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="shrink-0 font-mono text-muted">{formatDate(u.date)}</span>
                <span>{u.note}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="prose mt-10">
        <MdxContent source={project.body} />
      </div>
    </article>
  );
}
