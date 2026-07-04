import Link from "next/link";
import { site } from "@/lib/site";
import { getBatching, getFragmentation, getPrefixSharing } from "@/lib/bench";
import { getProjects, getPosts } from "@/lib/content";
import { SectionLabel, CornerTicks } from "@/components/ui";
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

/**
 * Build pipeline for the inference engine — a real, ordered system state, not a to-do list.
 * `state`: ok = shipped & tested, run = in progress, wait = queued. Edit as phases land.
 */
const pipeline: { state: "ok" | "run" | "wait"; stage: string; detail: string }[] = [
  { state: "ok", stage: "paged kv-cache allocator", detail: "arena + LIFO free list + per-block refcounts, tested" },
  { state: "ok", stage: "prefix sharing + copy-on-write", detail: "shared system prompts refcounted once" },
  { state: "ok", stage: "continuous-batching scheduler", detail: "reap → admit → decode with LIFO preemption" },
  { state: "ok", stage: "mechanism benchmarks", detail: "batching, fragmentation, saturation" },
  { state: "run", stage: "compute path", detail: "CPU reference ops + a paged-attention CUDA kernel" },
  { state: "wait", stage: "end-to-end model", detail: "safetensors loader → run a real 0.5B model" },
  { state: "wait", stage: "self-host KobeLLM", detail: "swap the live demo over to my own engine" },
];

const STATE_STYLE: Record<string, { tag: string; dot: string; ink: string }> = {
  ok: { tag: "ok", dot: "bg-accent", ink: "text-accent" },
  run: { tag: "run", dot: "bg-accent2 animate-pulse", ink: "text-accent2" },
  wait: { tag: "wait", dot: "bg-transparent border border-muted", ink: "text-muted" },
};

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

      {/* Engine signature — the live proof, measured */}
      <Reveal>
        <Link href="/projects/mini-inference-engine" className="group relative block border border-border bg-surface/70 p-6 transition-colors hover:border-accent/60">
          <CornerTicks className="opacity-40 transition-opacity group-hover:opacity-100" />
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-8">
              {stats.map((s) => (
                <div key={s.label}>
                  <div className="font-mono text-2xl font-bold tabular-nums tracking-tight text-accent sm:text-3xl">
                    {s.value}
                  </div>
                  <div className="mt-1.5 h-px w-8 bg-accent/40" />
                  <div className="mt-1.5 text-xs text-muted">{s.label}</div>
                </div>
              ))}
            </div>
            <div className="sm:max-w-[16rem] sm:text-right">
              <span className="eyebrow">mini inference engine</span>
              <span className="mt-1 block text-sm text-muted transition-colors group-hover:text-accent">
                Handwritten from-scratch (I write the .cpp implementation logic) LLM serving core in C++/CUDA 
                paged KV cache + continuous batching.
                Benchmarked at current progress (no compute yet)
              </span>
            </div>
          </div>
        </Link>
      </Reveal>

      {/* Live dashboard — the self-hosted stack reporting on itself */}
      <Reveal>
        <SiteDashboard build={build} />
      </Reveal>

      {/* Build pipeline — real system state, terminal-styled */}
      <Reveal>
        <section>
          <SectionLabel>~/status</SectionLabel>
          <div className="mt-5 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-2xl font-bold tracking-tight">What I&apos;m building next</h2>
            <code className="font-mono text-xs text-muted">status: mini-inference-engine</code>
          </div>

          <ol className="mt-8">
            {pipeline.map((p, i) => {
              const s = STATE_STYLE[p.state];
              return (
                <li key={p.stage} className="flex gap-4">
                  {/* pipeline rail */}
                  <div className="flex flex-col items-center pt-1.5">
                    <span className={`h-2.5 w-2.5 rounded-full ${s.dot}`} />
                    {i < pipeline.length - 1 && (
                      <span className={`mt-1 w-px flex-1 ${p.state === "ok" ? "bg-accent/40" : "bg-border"}`} />
                    )}
                  </div>
                  <div className="pb-6">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className={`font-mono text-xs ${s.ink}`}>{`[${s.tag}]`}</span>
                      <span className="font-mono text-sm">{p.stage}</span>
                    </div>
                    <p className="mt-1 text-sm text-muted">{p.detail}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      </Reveal>
    </div>
  );
}
