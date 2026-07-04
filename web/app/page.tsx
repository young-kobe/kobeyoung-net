import Link from "next/link";
import { site } from "@/lib/site";
import { getBatching, getFragmentation, getPrefixSharing } from "@/lib/bench";
import { getProjects, getPosts } from "@/lib/content";
import { HeroHeadline } from "@/components/Hero";
import { Reveal } from "@/components/Reveal";
import { SiteDashboard, type BuildFacts } from "@/components/SiteDashboard";

/** Build-time facts for the live dashboard (deploy SHA + content totals). The SHA/time are
 *  injected by CI; in dev they're absent, so we fall back to a "dev build" label. */
function buildFacts(): BuildFacts {
  const projects = getProjects();
  const posts = getPosts();
  const words = [...projects, ...posts].reduce(
    (n, d) => n + d.body.trim().split(/\s+/).filter(Boolean).length,
    0,
  );
  return {
    sha: (process.env.NEXT_PUBLIC_BUILD_SHA || "").slice(0, 7) || "dev",
    time: process.env.NEXT_PUBLIC_BUILD_TIME || "",
    projects: projects.length,
    posts: posts.length,
    words,
  };
}

export default function HomePage() {
  const batching = getBatching();
  const frag = getFragmentation();
  const prefix = getPrefixSharing();
  const stats = [
    { value: `${batching.speedup.toFixed(1)}×`, label: "throughput" },
    { value: `${Math.round(frag.savingsPct)}%`, label: "less KV memory" },
    { value: `${Math.round((1 - prefix.onMib / prefix.offMib) * 100)}%`, label: "less when shared" },
  ];
  const build = buildFacts();

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
          Building the behind-the-scenes systems that move data and run AI models — the parts people
          never see but use every day. Concretely: real-time data pipelines, RAG/LLM serving, and
          distributed backends on AWS and Azure. Former Navy avionics technician and residential
          electrician, now working my way down the stack toward systems and inference.
        </p>
        <div className="mt-8 flex flex-wrap gap-3 animate-rise" style={{ animationDelay: "220ms" }}>
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
        <p className="mt-8 font-mono text-xs text-muted animate-rise" style={{ animationDelay: "320ms" }}>
          {"// self-hosting the whole stack on one box · owner of multiple cats"}
        </p>
      </section>

      {/* Live dashboard — the self-hosted stack reporting on itself */}
      <Reveal>
        <SiteDashboard build={build} />
      </Reveal>

    </div>
  );
}
