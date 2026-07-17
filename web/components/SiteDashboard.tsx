"use client";

/**
 * Live ops dashboard for the self-hosted stack. Polls the Go backend's GET /stats every few
 * seconds and renders it as tiles: the KobeLLM demo model, the host box (CPU/mem/load from
 * /proc), and site counters (traffic + abuse deflected). Build facts (content counts, deploy
 * SHA) are baked at build time and passed as props — they don't change between polls.
 *
 * No charting library and no third-party analytics: same CSP-clean, privacy-first, own-every-
 * layer approach as the rest of the site. All numbers are public by design.
 */
import { useEffect, useState } from "react";
import { apiUrl } from "@/lib/site";
import { CornerTicks, SectionLabel } from "./ui";
import type { StatsResponse } from "@contract/api";

const POLL_MS = 4000;

export interface BuildFacts {
  sha: string;
  time: string; // ISO, or "" in dev
  projects: number;
  posts: number;
  words: number;
}

export function SiteDashboard({ build }: { build: BuildFacts }) {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [reachable, setReachable] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const r = await fetch(`${apiUrl}/stats`);
        if (!r.ok) throw new Error(String(r.status));
        const data = (await r.json()) as StatsResponse;
        if (cancelled) return;
        setStats(data);
        setReachable(true);
      } catch {
        if (!cancelled) setReachable(false);
      }
    }
    poll();
    const id = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const g = stats?.generation;
  const h = stats?.host;
  const s = stats?.site;
  const online = stats?.model.online ?? false;

  return (
    <section>
      <SectionLabel>~/live</SectionLabel>
      <div className="mt-5 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-2xl font-bold tracking-tight">kobeyoung.net live metrics dashboard</h2>
        <span className="flex items-center gap-1.5 font-mono text-xs text-muted">
          <span
            className={`h-2 w-2 rounded-full ${reachable ? "bg-accent animate-pulse" : "bg-muted/50"}`}
          />
          {reachable ? "polling /stats" : "dashboard offline"}
        </span>
      </div>

      <div className="relative mt-6 space-y-6 border border-border bg-surface/70 p-5">
        <CornerTicks className="opacity-40" />

        {/* KobeLLM — the live demo model + its measured generation stats */}
        <Group title={`kobellm · ${online ? "online" : "offline"}`}>
          <Tile label="model" value={stats?.model.name ?? "-"} sub={specSub(stats)} />
          <Tile label="throughput" value={g ? `${g.lastTokPerSec.toFixed(1)}` : "-"} sub="tok/s · last" accent />
          <Tile label="first token" value={g ? `${nf(g.lastTtftMs)}` : "-"} sub="ms · last" />
          <Tile
            label="responses"
            value={g ? nf(g.totalResponses) : "-"}
            sub={g ? `${nf(g.totalTokens)} tokens` : "since deploy"}
          />
          <Tile
            label="today"
            value={g ? `${nf(g.responsesToday)}` : "-"}
            sub={g ? `of ${nf(g.dailyCap)} budget` : "daily budget"}
          />
        </Group>

        {/* Host box — real machine utilization from /proc */}
        <Group title="host · hetzner box">
          <Tile label="cpu" value={h ? `${h.cpuPct.toFixed(0)}%` : "-"} sub={h ? `${h.cores} cores` : "utilization"} accent />
          <Tile label="memory" value={h ? `${h.memUsedPct.toFixed(0)}%` : "-"} sub="used" />
          <Tile label="load" value={h ? h.load1.toFixed(2) : "-"} sub="1-min avg" />
          <Tile label="machine up" value={h ? fmtUptime(h.uptimeSec) : "-"} sub="host uptime" />
        </Group>

        {/* Site — traffic, abuse deflected, and build facts */}
        <Group title="site · since last deploy">
          <Tile
            label="api requests"
            value={s ? nf(s.requests.total) : "-"}
            sub={s ? `${nf(s.requests.chat)} chat · ${nf(s.requests.contact)} contact` : "served"}
          />
          <Tile
            label="abuse deflected"
            value={s ? nf(s.abuse.honeypot + s.abuse.rateLimited + s.abuse.turnstileFailed) : "-"}
            sub={s ? `${nf(s.abuse.honeypot)} trap · ${nf(s.abuse.rateLimited)} limited` : "honeypot + limits"}
            accent
          />
          <Tile label="messages" value={s ? nf(s.contactSent) : "-"} sub="contact form" />
          <Tile label="content" value={nf(build.projects + build.posts)} sub={`${nf(build.words)} words written`} />
          <Tile label="deployed" value={build.sha} sub={build.time ? fmtAgo(build.time) : "dev build"} />
          <Tile label="api up" value={s ? fmtUptime(s.uptimeSec) : "-"} sub="process uptime" />
        </Group>
      </div>
    </section>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="eyebrow">{title}</div>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">{children}</div>
    </div>
  );
}

function Tile({
  label,
  value,
  sub,
  accent = false,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="border border-border bg-bg/50 p-3">
      <div className="text-[0.68rem] uppercase tracking-wide text-muted">{label}</div>
      <div className={`mt-1 truncate font-mono text-lg font-bold tabular-nums ${accent ? "text-accent" : ""}`}>
        {value}
      </div>
      {sub && <div className="mt-0.5 truncate text-[0.68rem] text-muted">{sub}</div>}
    </div>
  );
}

// ---- formatting helpers ----

const nf = (n: number) => n.toLocaleString("en-US");

function specSub(stats: StatsResponse | null): string {
  if (!stats) return "self-hosted";
  const { params, quant } = stats.model;
  return [params, quant].filter(Boolean).join(" · ") || "self-hosted";
}

function fmtUptime(sec: number): string {
  if (!sec || sec <= 0) return "-";
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (d) return `${d}d ${h}h`;
  if (h) return `${h}h ${m}m`;
  return `${m}m`;
}

function fmtAgo(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "recently";
  const sec = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}
