import Link from "next/link";
import { site } from "@/lib/site";
import { getBatching, getFragmentation, getPrefixSharing } from "@/lib/bench";
import { getWriteups, getPosts } from "@/lib/content";
import { HeroHeadline } from "@/components/Hero";
import { Reveal } from "@/components/Reveal";
import { SectionLabel } from "@/components/ui";
import { SiteDashboard, type BuildFacts } from "@/components/SiteDashboard";

/** Build-time facts for the live dashboard (deploy SHA + content totals). The SHA/time are
 *  injected by CI; in dev they're absent, so we fall back to a "dev build" label. */
function buildFacts(): BuildFacts {
  const writeups = getWriteups();
  const posts = getPosts();
  const words = [...writeups, ...posts].reduce(
    (n, d) => n + d.body.trim().split(/\s+/).filter(Boolean).length,
    0,
  );
  return {
    sha: (process.env.NEXT_PUBLIC_BUILD_SHA || "").slice(0, 7) || "dev",
    time: process.env.NEXT_PUBLIC_BUILD_TIME || "",
    projects: writeups.length,
    posts: posts.length,
    words,
  };
}

/** ts-llm-gateway production policies — sourced from the repo README. */
const GATEWAY_FEATURES = [
  { label: "Unified + OpenAI-compatible API", note: "one native endpoint plus a drop-in /v1/chat/completions" },
  { label: "Rate limiting", note: "per-key & per-IP token buckets, constant-time key checks" },
  { label: "Failover & retry", note: "exponential backoff + jitter across providers" },
  { label: "Circuit breaker", note: "quarantines a downed provider, half-open probes it back" },
  { label: "Streaming with abort", note: "SSE tokens; client disconnect cancels the upstream call" },
  { label: "Cache & state", note: "LRU response cache; in-memory or Upstash Redis, degrades gracefully" },
];

/** Verified numbers only — measured live, no fabricated metrics. */
const GATEWAY_METRICS = [
  { value: "~6×", label: "cache-hit speedup (0.22s vs 1.27s)" },
  { value: "87", label: "mock-injected tests, keyless in CI" },
  { value: "2", label: "providers behind one interface" },
];

/** The Civic Lens deep-dive series (content/writeups/civic-lens-*.mdx). */
const CIVIC_LENS_WRITEUPS = [
  { slug: "civic-lens-architecture", label: "System architecture", note: "Go crawler → SQLite → Python analysis → FastAPI → React" },
  { slug: "civic-lens-llm-evals", label: "LLM evals & CI gate", note: "golden set, replay mode, prompt fingerprinting" },
  { slug: "civic-lens-scoring", label: "Scoring methodology", note: "bot detection, sentiment, favorability, propaganda" },
  { slug: "civic-lens-database", label: "Database schema", note: "16 tables, 21 migrations, full traceability" },
  { slug: "civic-lens-invariants", label: "System invariants", note: "the correctness contract every change must keep" },
];

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
        <p className="eyebrow animate-rise">kobe young · software · systems · inference</p>
        <HeroHeadline className="mt-5 max-w-4xl font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl" />
        <p
          className="mt-6 max-w-2xl text-lg leading-relaxed text-muted animate-rise"
          style={{ animationDelay: "120ms" }}
        >
          Building the behind-the-scenes systems that move data and run AI models, the parts people
          never see but use every day. Concretely: real-time data pipelines, RAG/LLM serving, and
          distributed backends on AWS and Azure. Former Navy avionics technician and residential
          electrician, now working my way down the stack toward systems and inference.
        </p>
        <div className="mt-8 flex flex-wrap gap-3 animate-rise" style={{ animationDelay: "220ms" }}>
          <a
            href="https://civic-lens.info"
            target="_blank"
            rel="noopener"
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            Civic Lens · live
          </a>
          <Link
            href="/writeups"
            className="rounded-md border border-border px-4 py-2 text-sm font-medium transition-colors hover:border-accent hover:text-accent"
          >
            Read the writeups
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

      {/* Featured project — Civic Lens, deployed at civic-lens.info */}
      <Reveal>
        <section>
          <SectionLabel>featured · civic-lens.info</SectionLabel>
          <div className="mt-6 flex flex-wrap items-baseline gap-x-4 gap-y-2">
            <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Civic Lens</h2>
            <span className="font-mono text-xs text-muted">Go · Python · SQLite · FastAPI · React · LLM pipeline</span>
          </div>
          <p className="mt-4 max-w-2xl leading-relaxed text-muted">
            An audit-driven system that measures sampled political discourse across news, Reddit,
            and X: a polite, crash-safe Go crawler, an LLM analysis pipeline where every output
            carries a confidence score and a verbatim evidence span, narrative clustering, and a
            CI regression gate for prompt changes. Open source, deployed, and documented down to
            the invariants.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href="https://civic-lens.info"
              target="_blank"
              rel="noopener"
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              Open the live dashboard
            </a>
            <a
              href="https://github.com/young-kobe/civic-lens"
              target="_blank"
              rel="noopener"
              className="rounded-md border border-border px-4 py-2 text-sm font-medium transition-colors hover:border-accent hover:text-accent"
            >
              Source on GitHub
            </a>
          </div>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {CIVIC_LENS_WRITEUPS.map((w) => (
              <Link
                key={w.slug}
                href={`/writeups/${w.slug}`}
                className="group rounded-lg border border-border bg-surface p-4 transition-colors hover:border-accent"
              >
                <span className="text-sm font-medium transition-colors group-hover:text-accent">
                  {w.label}
                </span>
                <p className="mt-1.5 font-mono text-xs text-muted">{w.note}</p>
              </Link>
            ))}
          </div>
        </section>
      </Reveal>

      {/* Also featured — ts-llm-gateway, deployed on Vercel */}
      <Reveal>
        <section>
          <SectionLabel>also featured · ts-llm-gateway.vercel.app</SectionLabel>
          <div className="mt-6 flex flex-wrap items-baseline gap-x-4 gap-y-2">
            <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">ts-llm-gateway</h2>
            <span className="font-mono text-xs text-muted">TypeScript · Vercel AI SDK · AWS Bedrock + OpenAI · Hono · Upstash Redis</span>
          </div>
          <p className="mt-4 max-w-2xl leading-relaxed text-muted">
            A production-style, multi-provider LLM gateway in strict TypeScript: one unified API
            plus an OpenAI-compatible surface (a drop-in <span className="font-mono">baseURL</span>{" "}
            swap) that routes to AWS Bedrock and OpenAI behind a single injected provider interface,
            wrapped in real production policies: per-key/IP rate limiting, retry with backoff and
            cross-provider failover, a circuit breaker that quarantines a downed provider and
            probes it back, per-call timeouts, an LRU response cache, and SSE streaming that aborts
            the upstream call when the client disconnects.
          </p>
          <p className="mt-4 max-w-2xl leading-relaxed text-muted">
            The point: it&apos;s the same class of system I built at work, a real-time streaming
            pipeline, re-expressed as an LLM proxy. Kinesis backpressure became rate limiting;
            retry/backoff became failover; quarantining a bad dependency became the circuit breaker;
            shard-consumer cancellation became streaming abort; composite routing keys became
            provider routing; SignalR fan-out became SSE.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/gateway"
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              Try the live chat
            </Link>
            <a
              href="https://ts-llm-gateway.vercel.app/"
              target="_blank"
              rel="noopener"
              className="rounded-md border border-border px-4 py-2 text-sm font-medium transition-colors hover:border-accent hover:text-accent"
            >
              Live stats dashboard
            </a>
            <a
              href="https://github.com/young-kobe/ts-llm-gateway"
              target="_blank"
              rel="noopener"
              className="rounded-md border border-border px-4 py-2 text-sm font-medium transition-colors hover:border-accent hover:text-accent"
            >
              Source on GitHub
            </a>
          </div>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {GATEWAY_FEATURES.map((f) => (
              <div key={f.label} className="rounded-lg border border-border bg-surface p-4">
                <span className="text-sm font-medium">{f.label}</span>
                <p className="mt-1.5 font-mono text-xs text-muted">{f.note}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {GATEWAY_METRICS.map((m) => (
              <div key={m.label} className="rounded-lg border border-border bg-surface px-4 py-3">
                <div className="font-display text-2xl font-bold tabular-nums">{m.value}</div>
                <div className="mt-1 text-xs text-muted">{m.label}</div>
              </div>
            ))}
          </div>
          <p className="mt-4 font-mono text-xs text-muted">
            {"// ~6× cache-hit speedup and cross-provider failover both verified on the live deployment"}
          </p>
        </section>
      </Reveal>

      {/* Live dashboard — the self-hosted stack reporting on itself */}
      <Reveal>
        <SiteDashboard build={build} />
      </Reveal>

    </div>
  );
}
