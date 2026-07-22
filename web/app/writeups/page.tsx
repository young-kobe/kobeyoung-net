import type { Metadata } from "next";
import { getProjects, formatDate } from "@/lib/content";
import { CardLink, PageHeader, ProjectStatusBadge } from "@/components/ui";

export const metadata: Metadata = {
  title: "Writeups",
  description: "Technical writeups grouped by project: system architecture, LLM evals, scoring methodology, data pipelines, and inference engines.",
};

export default function WriteupsPage() {
  const projects = getProjects();
  return (
    <div>
      <PageHeader
        eyebrow="~/writeups"
        title="Writeups"
        lead="Deep-dives grouped by project. Open a project for its writeups and changelog."
      />

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {projects.map((p) => (
          <CardLink key={p.slug} href={`/writeups/projects/${p.slug}`} title={p.name}>
            <div className="mt-2 flex items-center gap-2">
              <ProjectStatusBadge status={p.status} />
            </div>
            <p className="mt-3 font-mono text-xs text-muted">
              {p.writeups.length} writeup{p.writeups.length === 1 ? "" : "s"} · last update{" "}
              {formatDate(p.lastActivity)}
            </p>
          </CardLink>
        ))}
      </div>
    </div>
  );
}
