"use client";

/**
 * Interactive "scope" chart primitives. The line chart draws its traces in on scroll (like a
 * signal sweeping across an oscilloscope) and exposes a movable crosshair that reads values into
 * a mono HUD — the live data-instrument feel. All data + tooltip rows are precomputed server-side
 * and passed as serializable props (no functions cross the server→client boundary). SVG colors are
 * applied via `style` so the theme CSS vars resolve.
 */
import { useEffect, useRef, useState } from "react";

const VB_W = 680;
const M = { top: 18, right: 18, bottom: 44, left: 48 };

export interface ScopeSeries {
  label: string;
  color: string; // e.g. "rgb(var(--accent))"
  dashed?: boolean;
  area?: boolean;
}
export interface ScopeRow {
  x: number;
  ys: (number | null)[]; // aligned to `series`
  tip: { label: string; value: string; color?: string }[];
}
export interface ScopeChartProps {
  rows: ScopeRow[];
  series: ScopeSeries[];
  xDomain: [number, number];
  yDomain: [number, number];
  xTicks: { v: number; label: string }[];
  yTicks: number[];
  xLabel?: string;
  yLabel?: string;
  logX?: boolean;
  markers?: { x: number; label: string }[];
  zones?: { x0: number; x1: number; label?: string }[];
  height?: number;
  ariaLabel: string;
}

/** Reveal on scroll-in. `reduce` reflects prefers-reduced-motion (skip the animation, show at once).
 *  No-JS is handled in CSS via `@media (scripting: none)` on the .scope-trace/.scope-area classes. */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setReduce(true);
      setShown(true);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return { ref, shown, reduce };
}

export function ScopeChart(props: ScopeChartProps) {
  const { rows, series, xDomain, yDomain, xTicks, yTicks, xLabel, yLabel, logX, markers, zones, ariaLabel } = props;
  const H = props.height ?? 300;
  const pw = VB_W - M.left - M.right;
  const ph = H - M.top - M.bottom;
  const { ref, shown, reduce } = useReveal();
  const svgRef = useRef<SVGSVGElement>(null);
  const [active, setActive] = useState<number | null>(null);

  const lx0 = Math.log10(xDomain[0]);
  const lx1 = Math.log10(xDomain[1]);
  const sx = (x: number) =>
    logX
      ? M.left + ((Math.log10(x) - lx0) / (lx1 - lx0)) * pw
      : M.left + ((x - xDomain[0]) / (xDomain[1] - xDomain[0])) * pw;
  const sy = (y: number) => M.top + (1 - (y - yDomain[0]) / (yDomain[1] - yDomain[0])) * ph;

  // Build a possibly-broken line path per series (null y → gap), and an area path for area series.
  const linePath = (si: number) => {
    let d = "";
    let pen = false;
    for (const r of rows) {
      const y = r.ys[si];
      if (y == null) {
        pen = false;
        continue;
      }
      d += `${pen ? "L" : "M"}${sx(r.x).toFixed(1)},${sy(y).toFixed(1)} `;
      pen = true;
    }
    return d.trim();
  };
  const areaPath = (si: number) => {
    const pts = rows.filter((r) => r.ys[si] != null);
    if (pts.length < 2) return "";
    const top = pts.map((r) => `${sx(r.x).toFixed(1)},${sy(r.ys[si] as number).toFixed(1)}`).join(" L");
    const y0 = sy(yDomain[0]);
    return `M${top} L${sx(pts[pts.length - 1].x).toFixed(1)},${y0.toFixed(1)} L${sx(pts[0].x).toFixed(1)},${y0.toFixed(1)} Z`;
  };

  const onMove = (clientX: number) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const vbX = ((clientX - rect.left) / rect.width) * VB_W;
    if (vbX < M.left - 6 || vbX > VB_W - M.right + 6) {
      setActive(null);
      return;
    }
    let best = 0;
    let bestD = Infinity;
    for (let i = 0; i < rows.length; i++) {
      const d = Math.abs(sx(rows[i].x) - vbX);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    setActive(best);
  };

  const activeRow = active != null ? rows[active] : null;
  const activeX = activeRow ? sx(activeRow.x) : 0;
  const hudLeftPct = (activeX / VB_W) * 100;
  const hudRight = hudLeftPct > 52;
  const gradId = `sweep-grad-${series.map((s) => s.label).join("-").replace(/\W/g, "")}`;

  return (
    <div ref={ref} className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VB_W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label={ariaLabel}
        onMouseMove={(e) => onMove(e.clientX)}
        onMouseLeave={() => setActive(null)}
        onTouchMove={(e) => e.touches[0] && onMove(e.touches[0].clientX)}
        onTouchEnd={() => setActive(null)}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" style={{ stopColor: series.find((s) => s.area)?.color ?? "rgb(var(--accent))", stopOpacity: 0.22 }} />
            <stop offset="100%" style={{ stopColor: series.find((s) => s.area)?.color ?? "rgb(var(--accent))", stopOpacity: 0 }} />
          </linearGradient>
        </defs>

        {/* shaded zones */}
        {zones?.map((z, i) => (
          <g key={i}>
            <rect x={sx(z.x0)} y={M.top} width={Math.max(0, sx(z.x1) - sx(z.x0))} height={ph}
              style={{ fill: "rgb(239 68 68)", opacity: 0.08 }} />
            {z.label && (
              <text x={sx(z.x0) + 4} y={M.top + 12} className="font-mono"
                style={{ fill: "rgb(239 68 68)", fontSize: "10px" }}>{z.label}</text>
            )}
          </g>
        ))}

        {/* horizontal gridlines + y ticks */}
        {yTicks.map((t) => (
          <g key={t}>
            <line x1={M.left} x2={VB_W - M.right} y1={sy(t)} y2={sy(t)} style={{ stroke: "rgb(var(--border))" }} strokeWidth={1} />
            <text x={M.left - 8} y={sy(t)} dy="0.32em" textAnchor="end" className="font-mono"
              style={{ fill: "rgb(var(--muted))", fontSize: "11px" }}>{t}</text>
          </g>
        ))}
        {/* x ticks */}
        {xTicks.map((t) => (
          <text key={t.label} x={sx(t.v)} y={H - M.bottom + 18} textAnchor="middle" className="font-mono"
            style={{ fill: "rgb(var(--muted))", fontSize: "11px" }}>{t.label}</text>
        ))}

        {/* markers */}
        {markers?.map((mk, i) => (
          <g key={i}>
            <line x1={sx(mk.x)} x2={sx(mk.x)} y1={M.top} y2={M.top + ph}
              style={{ stroke: "rgb(var(--accent))", opacity: 0.55 }} strokeWidth={1} strokeDasharray="3 3" />
            <text x={sx(mk.x) + 4} y={M.top + 11} className="font-mono"
              style={{ fill: "rgb(var(--accent))", fontSize: "10px" }}>{mk.label}</text>
          </g>
        ))}

        {/* area fills */}
        {series.map((s, si) =>
          s.area ? (
            <path key={`a${si}`} className="scope-area" d={areaPath(si)} fill={`url(#${gradId})`}
              style={{ opacity: shown ? 1 : 0, transition: reduce ? "none" : "opacity 700ms ease 300ms" }} />
          ) : null,
        )}

        {/* traces — sweep in via pathLength/dashoffset */}
        {series.map((s, si) => (
          <path
            key={`l${si}`}
            className="scope-trace"
            d={linePath(si)}
            fill="none"
            pathLength={1}
            style={{
              stroke: s.color,
              strokeWidth: 2.5,
              strokeLinejoin: "round",
              strokeLinecap: "round",
              strokeDasharray: 1,
              strokeDashoffset: shown ? 0 : 1,
              transition: reduce ? "none" : "stroke-dashoffset 950ms cubic-bezier(0.22,1,0.36,1)",
            }}
          />
        ))}

        {/* crosshair */}
        {activeRow && (
          <g>
            <line x1={activeX} x2={activeX} y1={M.top} y2={M.top + ph}
              style={{ stroke: "rgb(var(--accent-2))", opacity: 0.7 }} strokeWidth={1} />
            {series.map((s, si) =>
              activeRow.ys[si] != null ? (
                <circle key={si} cx={activeX} cy={sy(activeRow.ys[si] as number)} r={4}
                  style={{ fill: s.color, stroke: "rgb(var(--surface))" }} strokeWidth={1.5} />
              ) : null,
            )}
          </g>
        )}

        {/* axis titles */}
        {xLabel && (
          <text x={M.left + pw / 2} y={H - 5} textAnchor="middle" style={{ fill: "rgb(var(--muted))", fontSize: "11px" }}>{xLabel}</text>
        )}
        {yLabel && (
          <text transform={`rotate(-90 13 ${M.top + ph / 2})`} x={13} y={M.top + ph / 2} textAnchor="middle"
            style={{ fill: "rgb(var(--muted))", fontSize: "11px" }}>{yLabel}</text>
        )}
      </svg>

      {/* mono readout HUD */}
      {activeRow && (
        <div
          className="pointer-events-none absolute top-1 z-10 border border-accent2/50 bg-surface/95 px-2.5 py-1.5 font-mono text-[11px] leading-snug shadow-sm"
          style={{ left: `${hudLeftPct}%`, transform: hudRight ? "translateX(-100%)" : "translateX(0)" }}
        >
          {activeRow.tip.map((row, i) => (
            <div key={i} className="flex items-center gap-2 whitespace-nowrap">
              {row.color && <span className="inline-block h-2 w-2 shrink-0 rounded-sm" style={{ background: row.color }} />}
              <span className="text-muted">{row.label}</span>
              <span className="ml-auto tabular-nums text-fg">{row.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Animated comparison bars: naive baseline vs. the engine's approach; bars grow in on reveal. */
export function ScopeBars({
  rows,
  unit,
}: {
  rows: { label: string; value: number; color: string }[];
  unit: string;
}) {
  const { ref, shown, reduce } = useReveal();
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <div ref={ref} className="space-y-3">
      {rows.map((r, i) => (
        <div key={r.label} className="flex items-center gap-3 text-sm">
          <span className="w-40 shrink-0 text-muted">{r.label}</span>
          <div className="relative h-6 flex-1 overflow-hidden bg-bg">
            <div
              className="scope-bar h-6"
              style={{
                width: `${(r.value / max) * 100}%`,
                background: r.color,
                transformOrigin: "left",
                transform: shown ? "scaleX(1)" : "scaleX(0)",
                transition: reduce ? "none" : `transform 900ms cubic-bezier(0.22,1,0.36,1) ${i * 120}ms`,
              }}
            >
              <title>{`${r.label}: ${r.value} ${unit}`}</title>
            </div>
          </div>
          <span className="w-24 shrink-0 text-right font-mono tabular-nums">
            {r.value.toLocaleString()} {unit}
          </span>
        </div>
      ))}
    </div>
  );
}

/** A 10×10 block grid, used = accent, wasted = hairline. Cells fade in as a quick cascade. */
export function ScopeFragGrid({ label, wastePct }: { label: string; wastePct: number }) {
  const { ref, shown, reduce } = useReveal();
  const total = 100;
  const used = Math.round(total * (1 - wastePct / 100));
  return (
    <div ref={ref}>
      <div className="mb-2 text-xs text-muted">
        <span className="font-medium text-fg">{label}</span> — {wastePct.toFixed(0)}% wasted
      </div>
      <svg viewBox="0 0 100 100" className="h-auto w-full" role="img"
        aria-label={`${label}: ${(100 - wastePct).toFixed(0)}% of KV memory used, ${wastePct.toFixed(0)}% wasted`}>
        {Array.from({ length: total }, (_, i) => {
          const filled = i < used;
          const col = i % 10;
          const row = Math.floor(i / 10);
          return (
            <rect key={i} className="scope-cell" x={col * 10 + 1} y={row * 10 + 1} width={8} height={8} rx={1}
              style={{
                fill: filled ? "rgb(var(--accent))" : "transparent",
                stroke: filled ? "none" : "rgb(var(--border))",
                strokeWidth: 0.75,
                opacity: shown ? 1 : 0,
                transition: reduce ? "none" : `opacity 400ms ease ${(i % 10) * 12 + row * 12}ms`,
              }}
            />
          );
        })}
      </svg>
    </div>
  );
}
