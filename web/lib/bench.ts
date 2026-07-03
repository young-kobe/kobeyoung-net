/**
 * Loads the Mini Inference Engine benchmark CSVs (copied into `content/data/` from the
 * engine repo — see that dir's README) and shapes them for the writeup's inline-SVG figures.
 *
 * Read at build time in server components only. Zero-dependency CSV parsing: the inputs are
 * our own well-formed, comma-separated, quote-free numeric exports — not arbitrary CSV.
 */
import fs from "node:fs";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), "content", "data");

/** Parse a simple numeric CSV (header row + rows of comma-separated values) into records. */
function parseCsv(file: string): Record<string, string>[] {
  const raw = fs.readFileSync(path.join(DATA_DIR, file), "utf8").trim();
  const [header, ...lines] = raw.split(/\r?\n/);
  const cols = header.split(",");
  return lines.map((line) => {
    const cells = line.split(",");
    return Object.fromEntries(cols.map((c, i) => [c, cells[i]]));
  });
}

const num = (v: string) => Number(v);

/** Exp 1 — continuous vs. static batching: per-round batch occupancy time-series (downsampled). */
export interface OccupancyPoint {
  step: number;
  continuous: number;
  static: number;
}
export interface BatchingData {
  maxSeqs: number;
  continuousMakespan: number;
  staticMakespan: number;
  continuousOccupancy: number;
  staticOccupancy: number;
  speedup: number;
  series: OccupancyPoint[];
}

export function getBatching(): BatchingData {
  const summary = parseCsv("exp1_batching_summary.csv");
  const cont = summary.find((r) => r.mode === "continuous")!;
  const stat = summary.find((r) => r.mode === "static")!;

  const trace = parseCsv("exp1_batching_trace.csv");
  // Downsample to keep the SVG path small; always keep the last row so both lines land at 0.
  const target = 160;
  const stride = Math.max(1, Math.ceil(trace.length / target));
  const series: OccupancyPoint[] = [];
  for (let i = 0; i < trace.length; i += stride) {
    const r = trace[i];
    series.push({ step: num(r.step), continuous: num(r.continuous_running), static: num(r.static_running) });
  }
  const last = trace[trace.length - 1];
  series.push({ step: num(last.step), continuous: num(last.continuous_running), static: num(last.static_running) });

  return {
    maxSeqs: 32,
    continuousMakespan: num(cont.makespan_rounds),
    staticMakespan: num(stat.makespan_rounds),
    continuousOccupancy: num(cont.mean_batch_occupancy),
    staticOccupancy: num(stat.mean_batch_occupancy),
    speedup: num(stat.makespan_rounds) / num(cont.makespan_rounds),
    series,
  };
}

/** Exp 2 — paged vs. contiguous KV memory (peak footprint + per-sequence fragmentation). */
export interface FragmentationData {
  pagedMib: number;
  contiguousMib: number;
  savingsPct: number;
  pagedWastePct: number;
  contiguousWastePct: number;
}
export function getFragmentation(): FragmentationData {
  const rows = parseCsv("exp2_fragmentation_summary.csv");
  const peak = rows.find((r) => r.view === "peak_concurrent")!;
  const perSeq = rows.find((r) => r.view === "per_sequence_aggregate")!;
  return {
    pagedMib: num(peak.paged_mib),
    contiguousMib: num(peak.contiguous_mib),
    savingsPct: num(peak.savings_pct),
    pagedWastePct: num(perSeq.paged_waste_pct),
    contiguousWastePct: num(perSeq.contiguous_waste_pct),
  };
}

/** Exp 3 — prefix sharing: peak KV with a shared system prompt, sharing on vs. off. */
export interface PrefixData {
  requests: number;
  systemPromptTokens: number;
  offMib: number;
  onMib: number;
  /** The CSV's block-sharing fraction (~0.91). NOT the peak-memory reduction — for a headline
   *  figure derive `1 - onMib/offMib` (~0.81) so it matches the peak MiB actually shown. */
  savedFraction: number;
}
export function getPrefixSharing(): PrefixData {
  const rows = parseCsv("exp3_prefix_sharing.csv");
  const off = rows.find((r) => r.config === "sharing_off")!;
  const on = rows.find((r) => r.config === "sharing_on")!;
  return {
    requests: num(on.requests),
    systemPromptTokens: num(on.system_prompt_tokens),
    offMib: num(off.peak_mib),
    onMib: num(on.peak_mib),
    savedFraction: num(on.saved_fraction),
  };
}

/** Exp 4 — memory-pressure saturation sweep: throughput vs. pool size, with failures. */
export interface SaturationPoint {
  fracOfPeak: number;
  poolMib: number;
  throughput: number;
  preemptions: number;
  failed: number;
}
export function getSaturation(): SaturationPoint[] {
  return parseCsv("exp4_saturation.csv")
    .map((r) => ({
      fracOfPeak: num(r.frac_of_peak),
      poolMib: num(r.pool_mib),
      throughput: num(r.throughput_tok_per_round),
      preemptions: num(r.preemptions),
      failed: num(r.failed),
    }))
    .sort((a, b) => a.fracOfPeak - b.fracOfPeak);
}
