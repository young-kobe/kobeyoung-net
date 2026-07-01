import Link from "next/link";
import { site } from "@/lib/site";
import { getProjects, type ProjectStatus } from "@/lib/content";
import { CardLink, SectionLabel, StatusBadge, Tag } from "@/components/ui";
import { HeroHeadline } from "@/components/Hero";
import { Reveal } from "@/components/Reveal";

// Roadmap items — edit this list as plans change. This is a real ordered sequence,
// so the steps are numbered. `status` reuses the StatusBadge styles.
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
    <div className="space-y-20 sm:space-y-28">
      {/* Hero */}
      <section className="pt-4 sm:pt-8">
        <p className="eyebrow animate-rise">kobe young — software · systems · inference</p>
        <HeroHeadline className="mt-5 max-w-4xl font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl" />
        <p
          className="mt-6 max-w-2xl text-lg leading-relaxed text-muted animate-rise"
          style={{ animationDelay: "120ms" }}
        >
          Building the behind-the-scenes systems that move data and
          run AI models, the parts people never see but use every day. Concretely: real-time
          data pipelines, RAG/LLM serving, and distributed backends on AWS and Azure. Former
          Navy avionics technician and residential electrician, now working my way down the
          stack toward systems and inference.
        </p>
        <div
          className="mt-8 flex flex-wrap gap-3 animate-rise"
          style={{ animationDelay: "220ms" }}
        >
          <Link
            href="/projects"
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            View projects
          </Link>
          <Link
            href="/chat"
            className="rounded-md border border-border px-4 py-2 text-sm font-medium transition-colors hover:border-accent hover:text-accent"
          >
            Try KobeLLM
          </Link>
          <a
            href={site.socials.resume}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium transition-colors hover:border-accent hover:text-accent"
          >
            Resume
          </a>
        </div>
        <p
          className="mt-8 font-mono text-xs text-muted animate-rise"
          style={{ animationDelay: "320ms" }}
        >
          {"// self-hosting the whole stack on one box · owner of multiple cats"}
        </p>
      </section>

      {/* Featured projects */}
      <Reveal>
        <section>
          <SectionLabel>~/projects</SectionLabel>
          <div className="mt-5 flex items-baseline justify-between">
            <h2 className="font-display text-2xl font-bold tracking-tight">Featured projects</h2>
            <Link href="/projects" className="text-sm text-accent transition-colors hover:underline">
              All projects →
            </Link>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <CardLink key={p.slug} href={`/projects/${p.slug}`} title={p.frontmatter.title}>
                <div className="mt-2">
                  <StatusBadge status={p.frontmatter.status} />
                </div>
                <p className="mt-3 text-sm leading-relaxed text-muted">{p.frontmatter.summary}</p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {p.frontmatter.tags.map((t) => (
                    <Tag key={t}>{t}</Tag>
                  ))}
                </div>
              </CardLink>
            ))}
          </div>
        </section>
      </Reveal>

      {/* Roadmap — a real ordered sequence, hence the numbering */}
      <Reveal>
        <section>
          <SectionLabel>~/roadmap</SectionLabel>
          <h2 className="mt-5 font-display text-2xl font-bold tracking-tight">What I'm building next</h2>
          <ol className="mt-8">
            {roadmap.map((item, i) => (
              <li key={item.title} className="flex gap-5">
                {/* Timeline rail: mono step number + connector that grows to fill the row */}
                <div className="flex flex-col items-center">
                  <span className="font-mono text-xs font-medium tabular-nums text-accent">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {i < roadmap.length - 1 && <span className="mt-2 w-px flex-1 bg-border" />}
                </div>
                <div className="pb-10">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="font-medium">{item.title}</h3>
                    <StatusBadge status={item.status} />
                  </div>
                  <p className="mt-1.5 text-sm text-muted">{item.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </Reveal>
    </div>
  );
}
