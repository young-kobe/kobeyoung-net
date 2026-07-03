import type { Metadata } from "next";
import { site } from "@/lib/site";
import { PageHeader, SectionLabel } from "@/components/ui";

export const metadata: Metadata = {
  title: "About Me",
  description: "Kobe Young — from Navy avionics to software engineering, cloud to systems.",
};

/**
 * Skills grouped by area — scannable at a glance for recruiters, honest about depth.
 * Edit these lists as the stack changes.
 */
const skills: { area: string; items: string[] }[] = [
  { area: "Languages", items: ["Go", "C++20", "CUDA", "Python", "TypeScript", "SQL"] },
  { area: "Systems & inference", items: ["LLM serving", "Paged KV cache", "Continuous batching", "Concurrency", "Observability"] },
  { area: "Cloud & infra", items: ["AWS", "Azure", "ECS", "Bedrock", "Docker", "Self-hosting"] },
  { area: "Data & ML", items: ["RAG", "Sentiment pipelines", "Web crawling", "Evals", "Human-in-the-loop"] },
  { area: "Backend", items: ["REST / SSE", "SQLite", "Postgres", "Rate limiting", "Secure-by-default"] },
];


function Avatar() {
  return (
    // Plain <img>: CSP restricts img-src to self + data:, so a local asset is the right call.
    <img
      src="/images/kobe.jpg"
      alt="Kobe Young"
      width={120}
      height={120}
      className="h-[120px] w-[120px] shrink-0 rounded-xl border border-border object-cover"
    />
  );
}

export default function AboutPage() {
  return (
    <div>
      <PageHeader eyebrow="~/about" title="About Me" />

      {/* Intro: avatar + lead */}
      <div className="mt-8 flex flex-col gap-6 sm:flex-row sm:items-start">
        <Avatar />
        <div className="prose prose-sm">
          <p className="mt-0">
            I&apos;m {site.name}, a software engineer with roughly three years of production
            experience and a U.S. Navy background in avionics. I&apos;m finishing a B.S. in
            Computer Science while building systems that sit close to the metal: real-time data
            pipelines, retrieval-augmented LLM serving, and distributed backends on AWS and Azure.
          </p>
        </div>
      </div>

      {/* Skills matrix */}
      <section className="mt-6">
        <SectionLabel>~/skills</SectionLabel>
        <h2 className="mt-5 font-display text-2xl font-bold tracking-tight">What I work with</h2>
        <div className="mt-6 space-y-4">
          {skills.map((group) => (
            <div key={group.area} className="grid gap-2 sm:grid-cols-[10rem_1fr] sm:gap-4">
              <div className="pt-1 font-mono text-xs uppercase tracking-wide text-muted">{group.area}</div>
              <div className="flex flex-wrap gap-1.5">
                {group.items.map((s) => (
                  <span key={s} className="inline-block rounded-md border border-border bg-surface px-2.5 py-1 text-sm">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Focus + CTA */}
      <section className="prose mt-14">
        <h2>What I&apos;m focused on now</h2>
        <p>
          I&apos;m focusing on systems and inference work. Currently building a minimal
          inference engine to self-host open-source LLMs, which powers the live AI chatbot demo,{" "}
          <a href="/chat">KobeLLM</a> on this site. I care about latency, correctness under
          load, and software that&apos;s secure by default.
        </p>
        <p>
          I value clear writing (hence the <a href="/projects">writeups</a>), measurable results,
          and tools that respect the people using them. If you&apos;re hiring for backend,
          data, or ML-systems work, I&apos;d love to talk. Feel free to{" "}
          <a href="/contact">reach out</a>.
        </p>
      </section>
    </div>
  );
}
