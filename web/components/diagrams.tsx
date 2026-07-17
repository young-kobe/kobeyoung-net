/**
 * Hand-authored inline-SVG architecture diagrams for the project writeups. Server-rendered,
 * zero JS, theme-aware CSS-var colors — same CSP-clean approach as the benchmark charts.
 */

import { InstrumentFrame } from "./ui";

const ACCENT = "rgb(var(--accent))";
const MUTED = "rgb(var(--muted))";
const BORDER = "rgb(var(--border))";
const SURFACE = "rgb(var(--surface))";
const FG = "rgb(var(--fg))";

/** A labelled rounded-rect node. `lines[0]` is the bold title; the rest are muted sub-lines. */
function Node({
  x,
  y,
  w,
  h,
  lines,
  accent,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  lines: string[];
  accent?: boolean;
}) {
  const cx = x + w / 2;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={8} fill={SURFACE}
        stroke={accent ? ACCENT : BORDER} strokeWidth={accent ? 2 : 1} />
      {lines.map((ln, i) => (
        <text key={i} x={cx} y={y + 22 + i * 15} textAnchor="middle"
          className={i === 0 ? "font-sans" : "font-mono"}
          style={{ fill: i === 0 ? FG : MUTED, fontSize: i === 0 ? "13px" : "10.5px", fontWeight: i === 0 ? 600 : 400 }}>
          {ln}
        </text>
      ))}
    </g>
  );
}

function ArrowDefs() {
  return (
    <defs>
      <marker id="ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M0,0 L10,5 L0,10 z" fill={MUTED} />
      </marker>
      <marker id="ah-accent" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M0,0 L10,5 L0,10 z" fill={ACCENT} />
      </marker>
    </defs>
  );
}

/** The Mini Inference Engine request lifecycle + the paged-memory layer underneath it. */
export function EngineArchitecture() {
  return (
    <InstrumentFrame
      title="Request lifecycle: an iteration-level scheduler over a paged KV pool"
      badge="architecture"
    >
      <svg viewBox="0 0 720 340" className="h-auto w-full" role="img"
        aria-label="Architecture: a waiting FCFS queue feeds a reap-admit-decode scheduler that maintains a running batch of up to 32 sequences; under memory pressure it preempts the most-recent sequence back to the front of the queue. Every sequence's block table maps into a single paged block pool with a LIFO free list and per-block refcounts.">
        <ArrowDefs />
        {/* lifecycle row */}
        <Node x={16} y={40} w={150} h={64} lines={["Waiting queue", "std::deque · FCFS", "front = next in"]} />
        <Node x={270} y={30} w={180} h={84} lines={["Scheduler", "reap → admit → decode", "one step per round"]} accent />
        <Node x={554} y={40} w={150} h={64} lines={["Running batch", "≤ 32 sequences", "back = evict victim"]} />

        {/* admit / decode arrows */}
        <line x1={166} y1={72} x2={266} y2={72} stroke={MUTED} strokeWidth={1.5} markerEnd="url(#ah)" />
        <text x={216} y={64} textAnchor="middle" className="font-mono" style={{ fill: MUTED, fontSize: "10px" }}>admit</text>
        <line x1={450} y1={72} x2={550} y2={72} stroke={MUTED} strokeWidth={1.5} markerEnd="url(#ah)" />
        <text x={500} y={64} textAnchor="middle" className="font-mono" style={{ fill: MUTED, fontSize: "10px" }}>decode</text>

        {/* preemption loop: running → back to front of waiting */}
        <path d="M 570 104 C 570 150, 120 150, 91 108" fill="none" stroke={ACCENT} strokeWidth={1.5}
          strokeDasharray="4 3" markerEnd="url(#ah-accent)" />
        <text x={330} y={146} textAnchor="middle" className="font-mono" style={{ fill: ACCENT, fontSize: "10px" }}>
          preempt (LIFO) → re-queue at front, keep progress
        </text>

        {/* memory layer */}
        <Node x={16} y={216} w={688} h={96}
          lines={["Block pool · one contiguous arena", "fixed 16-token blocks · LIFO free list · per-block refcount[]", "OOM is a sentinel (kInvalidBlock), never an exception"]} />
        {/* connectors from running batch down to the pool */}
        <line x1={629} y1={104} x2={500} y2={214} stroke={BORDER} strokeWidth={1} markerEnd="url(#ah)" />
        <text x={604} y={180} textAnchor="middle" className="font-mono" style={{ fill: MUTED, fontSize: "10px" }}>
          block table →
        </text>
        <text x={610} y={194} textAnchor="middle" className="font-mono" style={{ fill: MUTED, fontSize: "10px" }}>
          physical blocks
        </text>
        <text x={200} y={200} textAnchor="middle" className="font-mono" style={{ fill: MUTED, fontSize: "10px" }}>
          shared prompt blocks refcounted once (prefix sharing + copy-on-write)
        </text>
      </svg>
    </InstrumentFrame>
  );
}

/** Civic Lens end-to-end data flow: Go ingestion → SQLite/blob storage → Python analysis → FastAPI cache → React. */
export function CivicLensPipeline() {
  return (
    <InstrumentFrame
      title="Data flow: three fetchers, one database, five analysis engines, a snapshot cache"
      badge="architecture"
    >
      <svg viewBox="0 0 720 430" className="h-auto w-full" role="img"
        aria-label="Civic Lens architecture: Go web crawler, Reddit fetcher, and X fetcher write to a SQLite database in WAL mode and a content-addressed raw blob store. A Python ETL and analysis layer runs bot detection, sentiment and favorability, citation extraction, LLM claim extraction, and narrative clustering, writing results back to SQLite. A FastAPI server serves pre-computed JSON snapshots from a cache to the React dashboard.">
        <ArrowDefs />
        {/* ingestion row (Go) */}
        <Node x={16} y={20} w={200} h={58} lines={["Web crawler (Go)", "SQLite frontier · polite · resumable"]} />
        <Node x={264} y={20} w={180} h={58} lines={["Reddit fetcher (Go)", "posts + comments"]} />
        <Node x={492} y={20} w={212} h={58} lines={["X fetcher (Go)", "posts · users · $ budget tracker"]} />

        {/* storage row */}
        <Node x={110} y={128} w={280} h={64} lines={["SQLite · civic_lens.db", "WAL mode · FKs on · 21 migrations"]} accent />
        <Node x={446} y={128} w={220} h={64} lines={["Raw blob store", "data/raw/sha256 · immutable"]} />

        {/* ingestion → storage */}
        <line x1={116} y1={78} x2={200} y2={124} stroke={MUTED} strokeWidth={1.5} markerEnd="url(#ah)" />
        <line x1={354} y1={78} x2={300} y2={124} stroke={MUTED} strokeWidth={1.5} markerEnd="url(#ah)" />
        <line x1={598} y1={78} x2={400} y2={126} stroke={MUTED} strokeWidth={1.5} markerEnd="url(#ah)" />
        <line x1={640} y1={78} x2={570} y2={124} stroke={BORDER} strokeWidth={1} markerEnd="url(#ah)" />
        <text x={655} y={108} textAnchor="middle" className="font-mono" style={{ fill: MUTED, fontSize: "10px" }}>raw bytes</text>

        {/* storage → analysis (and back) */}
        <line x1={230} y1={192} x2={230} y2={238} stroke={MUTED} strokeWidth={1.5} markerEnd="url(#ah)" />
        <line x1={290} y1={238} x2={290} y2={192} stroke={ACCENT} strokeWidth={1.5} markerEnd="url(#ah-accent)" />
        <text x={352} y={222} textAnchor="middle" className="font-mono" style={{ fill: ACCENT, fontSize: "10px" }}>ai_outputs · narratives · citations</text>
        <path d="M 556 192 L 556 214 L 480 214 L 480 238" fill="none" stroke={BORDER} strokeWidth={1} markerEnd="url(#ah)" />

        {/* analysis band (Python) */}
        <Node x={16} y={240} w={688} h={82}
          lines={["Analysis pipeline (Python)", "ETL → bot detection → sentiment + favorability → citations → claims (LLM) → narratives", "every output: confidence score + verbatim evidence span + model & prompt version"]} />

        {/* analysis → API/cache → UI */}
        <line x1={200} y1={322} x2={200} y2={358} stroke={MUTED} strokeWidth={1.5} markerEnd="url(#ah)" />
        <Node x={60} y={360} w={300} h={58} lines={["FastAPI + JSON cache", "pre-computed snapshots · admin-gated writes"]} />
        <line x1={364} y1={389} x2={438} y2={389} stroke={MUTED} strokeWidth={1.5} markerEnd="url(#ah)" />
        <Node x={442} y={360} w={230} h={58} lines={["React dashboard", "confidence shown · sources linked"]} />
      </svg>
    </InstrumentFrame>
  );
}

/** The Crawler + Sentiment pipeline data flow, branching at the confidence gate. */
export function CrawlerFlow() {
  return (
    <InstrumentFrame
      title="Data flow: crawl → score → gate, with every output traceable to source text"
      badge="architecture"
    >
      <svg viewBox="0 0 720 300" className="h-auto w-full" role="img"
        aria-label="Data flow: a polite resumable crawler writes to a snapshot cache; a sentiment pipeline computes deterministic signals refined by a pluggable LLM; a confidence gate routes high-confidence outputs to the traceable result store and low-confidence ones to a human-review queue that feeds back in.">
        <ArrowDefs />
        {/* top pipeline row */}
        <Node x={12} y={24} w={132} h={58} lines={["Crawler (Go)", "polite · resumable"]} />
        <Node x={196} y={24} w={132} h={58} lines={["Snapshot cache", "verbatim source"]} />
        <Node x={380} y={24} w={140} h={58} lines={["Sentiment (Py)", "deterministic signals"]} />
        <Node x={572} y={24} w={132} h={58} lines={["LLM refine", "pluggable · optional"]} />

        <line x1={144} y1={53} x2={192} y2={53} stroke={MUTED} strokeWidth={1.5} markerEnd="url(#ah)" />
        <line x1={328} y1={53} x2={376} y2={53} stroke={MUTED} strokeWidth={1.5} markerEnd="url(#ah)" />
        <line x1={520} y1={53} x2={568} y2={53} stroke={MUTED} strokeWidth={1.5} markerEnd="url(#ah)" />

        {/* down into the confidence gate */}
        <path d="M 638 82 L 638 120 L 360 120 L 360 148" fill="none" stroke={MUTED} strokeWidth={1.5} markerEnd="url(#ah)" />
        <Node x={280} y={150} w={160} h={58} lines={["Confidence gate", "score vs. threshold"]} accent />

        {/* branch: high → result store, low → human review */}
        <path d="M 440 179 L 560 179 L 560 220" fill="none" stroke={MUTED} strokeWidth={1.5} markerEnd="url(#ah)" />
        <text x={505} y={172} textAnchor="middle" className="font-mono" style={{ fill: MUTED, fontSize: "10px" }}>high</text>
        <Node x={492} y={222} w={136} h={54} lines={["Result store", "traceable output"]} />

        <path d="M 280 179 L 160 179 L 160 220" fill="none" stroke={ACCENT} strokeWidth={1.5} markerEnd="url(#ah-accent)" />
        <text x={215} y={172} textAnchor="middle" className="font-mono" style={{ fill: ACCENT, fontSize: "10px" }}>low</text>
        <Node x={92} y={222} w={136} h={54} lines={["Human review", "label → feed back"]} accent />
        {/* feedback arrow back up to sentiment */}
        <path d="M 92 249 C 30 249, 30 53, 194 53" fill="none" stroke={ACCENT} strokeWidth={1.25}
          strokeDasharray="4 3" markerEnd="url(#ah-accent)" />
      </svg>
    </InstrumentFrame>
  );
}
