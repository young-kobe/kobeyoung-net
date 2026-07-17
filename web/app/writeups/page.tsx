import type { Metadata } from "next";
import { getWriteups, formatDate } from "@/lib/content";
import { CardLink, PageHeader, StatusBadge, Tag } from "@/components/ui";

export const metadata: Metadata = {
  title: "Writeups",
  description: "Technical writeups: system architecture, LLM evals, scoring methodology, data pipelines, and inference engines.",
};

export default function WriteupsPage() {
  const writeups = getWriteups();
  return (
    <div>
      <PageHeader
        eyebrow="~/writeups"
        title="Writeups"
        lead="Deep-dives with status, metrics, and update logs."
      />
      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {writeups.map((p) => (
          <CardLink key={p.slug} href={`/writeups/${p.slug}`} title={p.frontmatter.title}>
            <div className="mt-2 flex items-center gap-2">
              <StatusBadge status={p.frontmatter.status} />
              <span className="text-xs text-muted">{formatDate(p.frontmatter.date)}</span>
            </div>
            <p className="mt-3 text-sm text-muted">{p.frontmatter.summary}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {p.frontmatter.tags.map((t) => (
                <Tag key={t}>{t}</Tag>
              ))}
            </div>
          </CardLink>
        ))}
      </div>
    </div>
  );
}
