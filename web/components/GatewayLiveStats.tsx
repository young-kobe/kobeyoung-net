"use client";

/**
 * Live counters from the ts-llm-gateway, polled via the Go backend's GET /gateway/stats
 * (which relays the gateway's own public /stats — the browser never calls Vercel directly).
 * Same tile aesthetic and CSP-clean, no-charting-library approach as the site dashboard.
 * All numbers are public by design. Renders an "offline" strip when the gateway demo is
 * disabled or unreachable, so it never breaks the page.
 */
import { useEffect, useState } from "react";
import { apiUrl } from "@/lib/site";
import { CornerTicks } from "./ui";
import type { GatewayStatsResponse } from "@contract/api";

const POLL_MS = 2000;

export function GatewayLiveStats() {
  const [data, setData] = useState<GatewayStatsResponse | null>(null);
  const [reachable, setReachable] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const r = await fetch(`${apiUrl}/gateway/stats`);
        if (!r.ok) throw new Error(String(r.status));
        const d = (await r.json()) as GatewayStatsResponse;
        if (cancelled) return;
        setData(d);
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

  const online = (data?.online ?? false) && reachable;
  const s = data?.stats;

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="eyebrow">ts-llm-gateway · live /stats</div>
        <span className="flex items-center gap-1.5 font-mono text-xs text-muted">
          <span className={`h-2 w-2 rounded-full ${online ? "bg-accent animate-pulse" : "bg-muted/50"}`} />
          {online ? "polling gateway" : "gateway offline"}
        </span>
      </div>

      <div className="relative mt-3 border border-border bg-surface/70 p-4">
        <CornerTicks className="opacity-40" />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          <Tile label="requests" value={s ? nf(s.requests) : "-"} sub={s ? `${nf(s.success)} ok · ${nf(s.errors)} err` : "served"} />
          <Tile label="cache hit rate" value={s ? pct(s.cache.hitRate) : "-"} sub={s ? `${nf(s.cache.hits)} hit · ${nf(s.cache.misses)} miss` : "LRU cache"} accent />
          <Tile label="p50 latency" value={s ? `${nf(s.latencyMs.p50)}` : "-"} sub="ms" />
          <Tile label="p99 latency" value={s ? `${nf(s.latencyMs.p99)}` : "-"} sub="ms" />
          <Tile label="failovers" value={s ? nf(s.failovers) : "-"} sub="provider switches" accent />
          <Tile label="providers" value={s ? `${nf(s.byProvider.bedrock)}/${nf(s.byProvider.openai)}` : "-"} sub="bedrock / openai" />
          <Tile label="tokens" value={s ? `${nf(s.tokens.input)}/${nf(s.tokens.output)}` : "-"} sub="in / out" />
          <Tile label="rejected" value={s ? nf(rejectedTotal(s)) : "-"} sub="rate-limit + auth + caps" />
        </div>
      </div>
    </div>
  );
}

function Tile({ label, value, sub, accent = false }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className="border border-border bg-bg/50 p-3">
      <div className="text-[0.68rem] uppercase tracking-wide text-muted">{label}</div>
      <div className={`mt-1 truncate font-mono text-lg font-bold tabular-nums ${accent ? "text-accent" : ""}`}>{value}</div>
      {sub && <div className="mt-0.5 truncate text-[0.68rem] text-muted">{sub}</div>}
    </div>
  );
}

const nf = (n: number) => n.toLocaleString("en-US");
const pct = (frac: number) => `${Math.round((frac || 0) * 100)}%`;

function rejectedTotal(s: NonNullable<GatewayStatsResponse["stats"]>): number {
  const r = s.rejected;
  return r.rate_limited + r.unauthorized + r.payload_too_large + r.invalid_request + r.model_not_allowed;
}
