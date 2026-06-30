/**
 * Components available inside MDX content. Drop any of these straight into a `.mdx`
 * file — e.g. <Callout type="warn">…</Callout>, <BarChart …/>, <Metrics …/>.
 */
import { CodeBlock } from "./CopyButton";

/** Map of tag/name → component passed to MDXRemote (local type; v6 dropped the export). */
type MDXComponents = Record<string, React.ComponentType<any>>;

export function Callout({
  type = "note",
  children,
}: {
  type?: "note" | "warn" | "tip";
  children: React.ReactNode;
}) {
  const styles = {
    note: "border-accent/40 bg-accent/5",
    warn: "border-amber-500/40 bg-amber-500/5",
    tip: "border-green-500/40 bg-green-500/5",
  }[type];
  return (
    <div className={`my-6 rounded-lg border px-4 py-3 text-sm ${styles}`} role="note">
      {children}
    </div>
  );
}

export function Figure({ src, alt, caption }: { src: string; alt: string; caption?: string }) {
  return (
    <figure className="my-6">
      {/* Local/optimized images; CSP restricts img-src to self + data:. */}
      <img src={src} alt={alt} className="rounded-lg border border-border" loading="lazy" />
      {caption && <figcaption className="mt-2 text-center text-sm text-muted">{caption}</figcaption>}
    </figure>
  );
}

/** Dependency-free horizontal bar chart (keeps the bundle small and the CSP clean).
 *  Swap for recharts/visx later if you need interactivity. */
export function BarChart({
  title,
  data,
  unit = "",
}: {
  title?: string;
  data: { label: string; value: number }[];
  unit?: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <figure className="my-6 rounded-lg border border-border bg-surface p-4">
      {title && <figcaption className="mb-3 text-sm font-medium">{title}</figcaption>}
      <div className="space-y-2">
        {data.map((d) => (
          <div key={d.label} className="flex items-center gap-3 text-sm">
            <span className="w-32 shrink-0 text-muted">{d.label}</span>
            <div className="h-5 flex-1 rounded bg-bg">
              <div
                className="h-5 rounded bg-accent"
                style={{ width: `${(d.value / max) * 100}%` }}
                role="img"
                aria-label={`${d.label}: ${d.value}${unit}`}
              />
            </div>
            <span className="w-20 shrink-0 text-right tabular-nums">
              {d.value}
              {unit}
            </span>
          </div>
        ))}
      </div>
    </figure>
  );
}

export function Metrics({
  caption,
  rows,
}: {
  caption?: string;
  rows: { metric: string; value: string; note?: string }[];
}) {
  return (
    <figure className="my-6 overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border text-left text-muted">
            <th className="py-2 pr-4 font-medium">Metric</th>
            <th className="py-2 pr-4 font-medium">Value</th>
            <th className="py-2 font-medium">Notes</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.metric} className="border-b border-border/60">
              <td className="py-2 pr-4">{r.metric}</td>
              <td className="py-2 pr-4 font-mono tabular-nums">{r.value}</td>
              <td className="py-2 text-muted">{r.note ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {caption && <figcaption className="mt-2 text-sm text-muted">{caption}</figcaption>}
    </figure>
  );
}

/** The component map passed to MDXRemote. `pre` is overridden to add the copy button. */
export const mdxComponents: MDXComponents = {
  Callout,
  Figure,
  BarChart,
  Metrics,
  pre: (props) => <CodeBlock>{props.children}</CodeBlock>,
};
