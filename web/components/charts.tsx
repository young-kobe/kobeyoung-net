/**
 * Server wrappers for the Mini Inference Engine figures. These read the benchmark CSVs at build
 * time (via lib/bench.ts), shape them into serializable props, and hand off to the interactive
 * client charts in charts.client.tsx. Framing/labels live here; motion + crosshair live client-side.
 */
import { InstrumentFrame } from "./ui";
import { ScopeChart, ScopeBars, ScopeFragGrid, type ScopeRow } from "./charts.client";
import {
  getBatching,
  getFragmentation,
  getPrefixSharing,
  getSaturation,
} from "@/lib/bench";

const ACCENT = "rgb(var(--accent))";
const MUTED = "rgb(var(--muted))";

function Legend({ items }: { items: { color: string; label: string }[] }) {
  return (
    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-muted">
      {items.map((it) => (
        <span key={it.label} className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: it.color }} />
          {it.label}
        </span>
      ))}
    </div>
  );
}

/** Instrument-style readout tiles — the "results at a glance" panel. */
export function StatStrip({
  items,
}: {
  items: { value: string; label: string; sub?: string }[];
}) {
  return (
    <div className="my-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((it) => (
        <div key={it.label} className="relative border border-border bg-surface/70 p-4">
          <span className="pointer-events-none absolute left-0 top-0 h-2 w-2 border-l border-t border-accent/60" />
          <span className="pointer-events-none absolute bottom-0 right-0 h-2 w-2 border-b border-r border-accent/60" />
          <div className="font-mono text-2xl font-bold tabular-nums tracking-tight text-accent sm:text-3xl">
            {it.value}
          </div>
          <div className="mt-1.5 h-px w-8 bg-accent/40" />
          <div className="mt-1.5 text-sm font-medium">{it.label}</div>
          {it.sub && <div className="mt-0.5 text-xs text-muted">{it.sub}</div>}
        </div>
      ))}
    </div>
  );
}

/** The four headline numbers. */
export function BenchHeadline() {
  const b = getBatching();
  const f = getFragmentation();
  const p = getPrefixSharing();
  const prefixSavedPct = Math.round((1 - p.onMib / p.offMib) * 100);
  return (
    <StatStrip
      items={[
        { value: `${b.speedup.toFixed(1)}×`, label: "throughput", sub: "continuous vs. static batching" },
        { value: `${Math.round(f.savingsPct)}%`, label: "less peak KV", sub: "paging vs. contiguous reserve" },
        { value: `${prefixSavedPct}%`, label: "less KV shared", sub: "128 reqs, one system prompt" },
        { value: "0", label: "dropped reqs", sub: "down to 1/10th the KV budget" },
      ]}
    />
  );
}

/** Exp 1 — continuous vs. static batching, occupancy over decode rounds. */
export function BenchBatching() {
  const b = getBatching();
  const rows: ScopeRow[] = b.series.map((p) => {
    const cont = p.step <= b.continuousMakespan ? p.continuous : null;
    return {
      x: p.step,
      ys: [cont, p.static],
      tip: [
        { label: "round", value: p.step.toLocaleString() },
        { label: "continuous", value: cont == null ? "done" : `${cont}/32`, color: ACCENT },
        { label: "static", value: `${p.static}/32`, color: MUTED },
      ],
    };
  });
  return (
    <InstrumentFrame
      title="Batch occupancy over time — continuous vs. static batching"
      badge="exp 1"
      footnote={
        <>
          Same workload (256 requests), same generous KV pool, 32 batch slots. Continuous batching
          holds mean occupancy {b.continuousOccupancy.toFixed(1)}/32 and finishes in{" "}
          {b.continuousMakespan.toLocaleString()} rounds; static holds {b.staticOccupancy.toFixed(1)}/32
          and takes {b.staticMakespan.toLocaleString()} — {b.speedup.toFixed(2)}× fewer rounds. Rounds
          are a scheduling step, not wall-clock. Hover to inspect.
        </>
      }
    >
      <ScopeChart
        rows={rows}
        series={[
          { label: "continuous", color: ACCENT, area: true },
          { label: "static", color: MUTED },
        ]}
        xDomain={[0, b.staticMakespan]}
        yDomain={[0, 32]}
        xTicks={[0, 1000, 2000, 3000].map((v) => ({ v, label: v.toLocaleString() }))}
        yTicks={[0, 8, 16, 24, 32]}
        xLabel="decode rounds"
        markers={[{ x: b.continuousMakespan, label: "continuous done" }]}
        ariaLabel={`Continuous batching stays near ${b.continuousOccupancy.toFixed(0)} of 32 slots and finishes in ${b.continuousMakespan} rounds; static averages ${b.staticOccupancy.toFixed(0)} of 32 and takes ${b.staticMakespan}.`}
      />
      <Legend
        items={[
          { color: ACCENT, label: `continuous — ${b.continuousOccupancy.toFixed(1)}/32 avg` },
          { color: MUTED, label: `static — ${b.staticOccupancy.toFixed(1)}/32 avg` },
        ]}
      />
    </InstrumentFrame>
  );
}

/** Exp 2 — paged vs. contiguous KV memory: peak footprint + fragmentation grids. */
export function BenchFragmentation() {
  const f = getFragmentation();
  return (
    <InstrumentFrame
      title="Peak KV memory — paging vs. contiguous reserve-to-max"
      badge="exp 2"
      footnote={
        <>
          A contiguous allocator reserves each sequence&apos;s max context up front, wasting{" "}
          {f.contiguousWastePct.toFixed(0)}% of it; paging allocates 16-token blocks on demand and
          wastes only the partial final block (~{f.pagedWastePct.toFixed(0)}%). Peak live footprint
          drops {f.savingsPct.toFixed(0)}%.
        </>
      }
    >
      <ScopeBars
        rows={[
          { label: "contiguous (reserve-to-max)", value: Math.round(f.contiguousMib), color: MUTED },
          { label: "paged (on demand)", value: Math.round(f.pagedMib), color: ACCENT },
        ]}
        unit="MiB"
      />
      <div className="mt-5 grid grid-cols-2 gap-4">
        <ScopeFragGrid label="paged" wastePct={f.pagedWastePct} />
        <ScopeFragGrid label="contiguous" wastePct={f.contiguousWastePct} />
      </div>
    </InstrumentFrame>
  );
}

/** Exp 3 — prefix sharing: peak KV with a shared system prompt, on vs. off. */
export function BenchPrefix() {
  const p = getPrefixSharing();
  return (
    <InstrumentFrame
      title="Peak KV memory — prefix sharing on vs. off"
      badge="exp 3"
      footnote={
        <>
          {p.requests} requests sharing an identical {p.systemPromptTokens}-token system prompt. With
          sharing on, the prompt&apos;s blocks are refcounted once instead of copied {p.requests}{" "}
          times — {Math.round((1 - p.onMib / p.offMib) * 100)}% less peak KV.
        </>
      }
    >
      <ScopeBars
        rows={[
          { label: "sharing off", value: Math.round(p.offMib), color: MUTED },
          { label: "sharing on", value: Math.round(p.onMib), color: ACCENT },
        ]}
        unit="MiB"
      />
    </InstrumentFrame>
  );
}

/** Exp 4 — memory-pressure saturation: throughput vs. KV pool size (log scale). */
export function BenchSaturation() {
  const pts = getSaturation();
  const firstFail = pts.find((p) => p.failed > 0);
  const rows: ScopeRow[] = pts.map((p) => ({
    x: p.fracOfPeak,
    ys: [p.throughput],
    tip: [
      { label: "pool", value: `${p.poolMib.toFixed(0)} MiB · ${p.fracOfPeak}×` },
      { label: "throughput", value: `${p.throughput.toFixed(1)}/round`, color: ACCENT },
      { label: "preemptions", value: `${p.preemptions}` },
      ...(p.failed > 0 ? [{ label: "dropped", value: `${p.failed}`, color: "rgb(239 68 68)" }] : []),
    ],
  }));
  return (
    <InstrumentFrame
      title="Throughput under memory pressure — graceful, then a cliff"
      badge="exp 4"
      footnote={
        <>
          Fixed workload; KV pool shrunk from 2× down to 0.04× of the natural peak. Throughput
          degrades smoothly with <strong>zero dropped requests down to 1/10th</strong> the budget —
          the engine recomputes more via preemption. Requests drop only below ~0.06×, where the pool
          can&apos;t hold even one long sequence. Hover a point for pool size and preemptions.
        </>
      }
    >
      <ScopeChart
        rows={rows}
        series={[{ label: "throughput", color: ACCENT, area: true }]}
        xDomain={[pts[0].fracOfPeak, pts[pts.length - 1].fracOfPeak]}
        yDomain={[0, 26]}
        logX
        xTicks={[0.04, 0.1, 0.25, 0.5, 1, 2].map((v) => ({ v, label: `${v}×` }))}
        yTicks={[0, 5, 10, 15, 20, 25]}
        xLabel="KV pool size (× natural peak, log scale)"
        yLabel="tok / round"
        zones={firstFail ? [{ x0: pts[0].fracOfPeak, x1: firstFail.fracOfPeak * 1.09, label: "requests dropped" }] : []}
        ariaLabel="Throughput stays high with no dropped requests until the KV pool falls below about 0.06x of the natural peak, where a cliff begins."
      />
    </InstrumentFrame>
  );
}
