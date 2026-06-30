import Link from "next/link";
import { site } from "@/lib/site";
import { getProjects, type ProjectStatus } from "@/lib/content";
import { CardLink, StatusBadge, Tag } from "@/components/ui";

// Roadmap items — edit this list as plans change. `status` reuses the project
// StatusBadge styles (shipped | in-progress | planned).
const roadmap: { title: string; status: ProjectStatus; detail: string }[] = [
  {
    title: "Finish the inference engine",
    status: "in-progress",
    detail: "A minimal engine to self-host open-source LLMs from scratch.",
  },
  {
    title: "Wire the engine into the site",
    status: "planned",
    detail: "Swap the model behind KobeLLM over to my own engine.",
  },
  {
    title: "Build a harness on top",
    status: "planned",
    detail: "Evaluation and tooling layered on the inference engine.",
  },
];

export default function HomePage() {
  const projects = getProjects().slice(0, 3);

  return (
    <div className="space-y-16">
      {/* Hero */}
      <section className="pt-6">
        <p className="text-sm font-medium text-accent">Software Engineer · U.S. Navy Veteran</p>
        <h1 className="mt-3 text-4xl sm:text-5xl font-bold tracking-tight">
          Builder of real-time data pipelines and LLM systems. Owner of multiple cats.
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-muted">
          Hello! My name is Kobe, welcome to my Portfolio website! Ultra-quick background on me:
          I have 3 years of experience shipping production data pipelines, RAG/LLM serving, and
          distributed backends on AWS/Azure. Former Navy avionics technician and residential electrician,
          current software engineer and AI engieer, wanting to enter the world of systems and inference.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link
            href="/projects"
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity"
          >
            View projects
          </Link>
          <Link
            href="/chat"
            className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:border-accent transition-colors"
          >
            Try KobeLLm
          </Link>
          <a
            href={site.socials.resume}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:border-accent transition-colors"
          >
            Resume (PDF)
          </a>
        </div>
      </section>

      {/* Featured projects */}
      <section>
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-semibold tracking-tight">Featured projects</h2>
          <Link href="/projects" className="text-sm text-accent hover:underline">All projects →</Link>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <CardLink key={p.slug} href={`/projects/${p.slug}`} title={p.frontmatter.title}>
              <div className="mt-2"><StatusBadge status={p.frontmatter.status} /></div>
              <p className="mt-3 text-sm text-muted">{p.frontmatter.summary}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {p.frontmatter.tags.map((t) => (
                  <Tag key={t}>{t}</Tag>
                ))}
              </div>
            </CardLink>
          ))}
        </div>
      </section>

      {/* What's next — roadmap timeline */}
      <section>
        <h2 className="text-xl font-semibold tracking-tight">Development roadmap</h2>
        <ol className="mt-6">
          {roadmap.map((item, i) => (
            <li key={item.title} className="flex gap-4">
              {/* Timeline rail: dot + connector that grows to fill the row */}
              <div className="flex flex-col items-center">
                <span className="mt-1.5 h-3 w-3 shrink-0 rounded-full border-2 border-accent bg-bg" />
                {i < roadmap.length - 1 && <span className="mt-1 w-px flex-1 bg-border" />}
              </div>
              <div className="pb-8">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="font-medium">{item.title}</h3>
                  <StatusBadge status={item.status} />
                </div>
                <p className="mt-1 text-sm text-muted">{item.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
