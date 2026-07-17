import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader, SectionLabel } from "@/components/ui";

export const metadata: Metadata = {
  title: "Work With Me",
  description:
    "I audit AI apps and cut LLM token spend without killing quality: model routing, caching, and evals for teams throttling AI cost.",
};

const steps: { n: string; title: string; detail: string }[] = [
  { n: "01", title: "Connect", detail: "Point your logs or a drop-in OpenAI-compatible proxy at your traffic. No app rewrite." },
  { n: "02", title: "Analyze", detail: "Attribute spend per endpoint, per request type, per model. Find where the money actually goes." },
  { n: "03", title: "Compare", detail: "Run your real prompts across frontier, open-weight, and local models: cost, latency, and a quality score side by side." },
  { n: "04", title: "Route & cache", detail: "Send each task to the cheapest model that passes its quality bar; cache aggressively; escalate only on failure." },
  { n: "05", title: "Prove it", detail: "Before/after spend, with the quality evidence to show nothing regressed." },
];

const audiences = [
  "Startups running AI support bots",
  "Agencies shipping AI apps for clients",
  "SaaS teams with RAG features",
  "Internal-tools teams",
  "Dev shops leaning hard on Claude / OpenAI",
  "Industrial & maintenance teams doing document Q&A",
];

/** Illustrative example — NOT a real client engagement. Labeled as such below. */
function MigrationReport() {
  return (
    <figure className="my-8 overflow-hidden rounded-lg border border-border bg-surface">
      <div className="border-b border-border px-4 py-2 font-mono text-xs text-muted">
        migration-report.txt · illustrative example
      </div>
      <div className="space-y-4 p-5 font-mono text-sm">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-xs text-muted">Monthly spend</div>
            <div className="mt-1 text-lg tabular-nums line-through decoration-muted/50">$4,820</div>
          </div>
          <div>
            <div className="text-xs text-muted">Optimized</div>
            <div className="mt-1 text-lg tabular-nums">$1,140</div>
          </div>
          <div>
            <div className="text-xs text-muted">Savings</div>
            <div className="mt-1 text-lg font-bold tabular-nums text-accent">76.3%</div>
          </div>
        </div>
        <div>
          <div className="mb-1.5 text-xs text-muted">Recommended changes</div>
          <ul className="space-y-1 text-[0.8rem] leading-relaxed">
            <li>+ Move summarization endpoint from frontier → open-weight model</li>
            <li>+ Add prompt cache for the support-bot system prompt</li>
            <li>+ Cap context at 12K tokens for ticket triage</li>
            <li>+ Use a frontier model only on failed-validation retries</li>
            <li>+ Batch nightly document-summarization jobs</li>
          </ul>
        </div>
      </div>
      <figcaption className="border-t border-border px-4 py-2 text-xs text-muted">
        Illustrative example, not a real client&apos;s data: the shape of what a spend audit produces.
      </figcaption>
    </figure>
  );
}

export default function WorkPage() {
  return (
    <div>
      <PageHeader
        eyebrow="~/work"
        title="Cut your LLM bill without killing quality"
        lead="Teams are throttling AI spend, not abandoning it. I audit AI apps and bring token cost under control (model routing, caching, and evals) with the evidence to prove quality held."
      />

      {/* The offer */}
      <section className="mt-12">
        <SectionLabel>~/the-pitch</SectionLabel>
        <div className="prose mt-5">
          <p>
            The market moved from &ldquo;use the smartest frontier model everywhere&rdquo; to
            &ldquo;route each task to the cheapest model that&apos;s good enough, measure quality,
            cache aggressively, and escalate only when needed.&rdquo; That&apos;s systems work:
            routing, caching, evals, cost attribution, and latency control: the layer I build.
          </p>
          <p>
            I come at it from the inside. I&apos;ve built a from-scratch{" "}
            <Link href="/writeups/mini-inference-engine">LLM inference engine</Link> (KV cache,
            batching, throughput), self-host models, and have run RAG in production, so the
            recommendations are grounded in how inference actually costs money, not guesswork.
          </p>
        </div>
      </section>

      {/* Deliverable steps */}
      <section className="mt-12">
        <SectionLabel>~/engagement</SectionLabel>
        <h2 className="mt-5 font-display text-2xl font-bold tracking-tight">How it works</h2>
        <ol className="mt-8">
          {steps.map((s, i) => (
            <li key={s.n} className="flex gap-5">
              <div className="flex flex-col items-center">
                <span className="font-mono text-xs font-medium tabular-nums text-accent">{s.n}</span>
                {i < steps.length - 1 && <span className="mt-2 w-px flex-1 bg-border" />}
              </div>
              <div className="pb-8">
                <h3 className="font-medium">{s.title}</h3>
                <p className="mt-1.5 text-sm text-muted">{s.detail}</p>
              </div>
            </li>
          ))}
        </ol>
        <MigrationReport />
      </section>

      {/* Who it's for */}
      <section className="mt-12">
        <SectionLabel>~/who-its-for</SectionLabel>
        <div className="mt-6 flex flex-wrap gap-2">
          {audiences.map((a) => (
            <span key={a} className="inline-block rounded-md border border-border bg-surface px-3 py-1.5 text-sm">
              {a}
            </span>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mt-12 rounded-lg border border-border bg-surface p-6">
        <h2 className="font-display text-xl font-bold tracking-tight">Spending too much on tokens?</h2>
        <p className="mt-2 text-sm text-muted">
          Tell me what you&apos;re running and roughly what it costs. I&apos;ll tell you where the
          savings are.
        </p>
        <Link
          href="/contact"
          className="mt-4 inline-block rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          Start a conversation →
        </Link>
      </section>
    </div>
  );
}
