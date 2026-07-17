"use client";

import { useEffect, useRef, useState } from "react";
import { apiUrl } from "@/lib/site";
import { Turnstile, turnstileEnabled } from "./Turnstile";
import type { ChatMessage, ChatStreamEvent, HealthResponse, StreamStats } from "@contract/api";

type Health = "checking" | "online" | "offline";

type DemoChatProps = {
  /** Backend chat route to POST to (SSE). Defaults to the self-hosted KobeLLM proxy. */
  endpoint?: string;
  /** Backend health route used for the online/offline check + header label. */
  healthPath?: string;
  /** Small right-aligned note in the header strip. */
  footerNote?: string;
  /** One-line blurb on the click-to-start screen. */
  startBlurb?: string;
  /** Overrides the start-screen spec rows (self-hosted model card by default). */
  specs?: Array<{ label: string; value: string }>;
  /** Clickable example prompts shown before the first message. */
  suggestions?: string[];
};

export function DemoChat({
  endpoint = "/chat",
  healthPath = "/health",
  footerNote = "Streaming · self-hosted",
  startBlurb = "A live chat with a self-hosted open-source LLM.",
  specs,
  suggestions,
}: DemoChatProps = {}) {
  const [health, setHealth] = useState<Health>("checking");
  const [modelName, setModelName] = useState<string>("");
  const [modelParams, setModelParams] = useState<string>("");
  const [modelQuant, setModelQuant] = useState<string>("");
  const [started, setStarted] = useState(false); // click-to-start so bots don't auto-hammer
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [liveTokens, setLiveTokens] = useState(0); // token count for the in-flight response
  const [lastStats, setLastStats] = useState<StreamStats | null>(null); // metrics for the last response
  const [token, setToken] = useState("");
  const [tsReset, setTsReset] = useState(0); // bumped after each send to re-challenge Turnstile
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${apiUrl}${healthPath}`)
      .then((r) => r.json() as Promise<HealthResponse>)
      .then((h) => {
        if (cancelled) return;
        setHealth(h.model === "online" ? "online" : "offline");
        if (h.modelName) setModelName(h.modelName);
        if (h.modelParams) setModelParams(h.modelParams);
        if (h.modelQuant) setModelQuant(h.modelQuant);
      })
      .catch(() => !cancelled && setHealth("offline"));
    return () => {
      cancelled = true;
    };
  }, [healthPath]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  async function send(override?: string) {
    const text = (override ?? input).trim();
    if (!text || streaming) return;
    if (turnstileEnabled && !token) return;

    const next: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages([...next, { role: "assistant", content: "" }]);
    setInput("");
    setStreaming(true);
    setLiveTokens(0);
    setLastStats(null);

    try {
      const res = await fetch(`${apiUrl}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, turnstileToken: token || undefined }),
      });
      // Don't bail on a non-2xx status: abuse responses (429/503) still carry an SSE
      // `error` event with a human message we want to show. Only a missing body is fatal.
      if (!res.body) throw new Error("no stream");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // Parse complete SSE events (separated by a blank line).
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";
        for (const block of events) {
          const line = block.split("\n").find((l) => l.startsWith("data:"));
          if (!line) continue;
          const json = line.slice(5).trim();
          if (json === "[DONE]") continue;
          let ev: ChatStreamEvent;
          try {
            ev = JSON.parse(json);
          } catch {
            continue;
          }
          if (ev.type === "token") {
            appendToLast(setMessages, ev.token);
            setLiveTokens((n) => n + 1);
          } else if (ev.type === "error") {
            appendToLast(setMessages, `\n\n⚠️ ${ev.message}`);
          } else if (ev.type === "done" && ev.stats) {
            setLastStats(ev.stats);
          }
        }
      }
    } catch {
      appendToLast(setMessages, "\n\n⚠️ The demo is offline right now. Please try again later.");
      setHealth("offline");
    } finally {
      setStreaming(false);
      // Turnstile tokens are single-use — invalidate and re-challenge for the next turn.
      if (turnstileEnabled) {
        setToken("");
        setTsReset((n) => n + 1);
      }
    }
  }

  if (health === "offline") {
    return (
      <div className="rounded-lg border border-border bg-surface p-6 text-center">
        <p className="font-medium">Demo offline</p>
        <p className="mt-1 text-sm text-muted">
          The inference backend isn&apos;t reachable right now. The rest of the site works
          normally — check back soon.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-surface">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5 text-sm">
        <span className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${health === "online" ? "bg-green-500" : "bg-zinc-400"}`} />
          {health === "checking" ? "Checking…" : `Model: ${modelName || "online"}`}
        </span>
        <span className="text-xs text-muted">{footerNote}</span>
      </div>

      {!started ? (
        <div className="p-6 text-center">
          <p className="text-muted">{startBlurb}</p>
          {specs ? (
            <dl className="mx-auto mt-5 max-w-xs space-y-1.5 text-sm">
              {specs.map((s) => (
                <SpecRow key={s.label} label={s.label} value={s.value} />
              ))}
            </dl>
          ) : (
            <dl className="mx-auto mt-5 max-w-xs space-y-1.5 text-sm">
              <SpecRow label="Model" value={modelName || "—"} />
              {modelParams && <SpecRow label="Parameters" value={modelParams} />}
              {modelQuant && <SpecRow label="Quantization" value={modelQuant} />}
              <SpecRow label="Runtime" value="llama.cpp · CPU" />
              <SpecRow label="Hosting" value="1 box · no external API" />
            </dl>
          )}
          <button
            onClick={() => setStarted(true)}
            disabled={health !== "online"}
            className="mt-6 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
          >
            Start chat
          </button>
        </div>
      ) : (
        <>
          <div ref={scrollRef} className="h-80 space-y-4 overflow-y-auto p-4">
            {messages.length === 0 && (
              <div className="space-y-3">
                <p className="text-sm text-muted">Ask the model anything to see token streaming.</p>
                {suggestions && suggestions.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {suggestions.map((s) => (
                      <button
                        key={s}
                        onClick={() => send(s)}
                        disabled={streaming || (turnstileEnabled && !token)}
                        className="rounded-md border border-border bg-bg px-2.5 py-1 text-left text-xs text-muted transition-colors hover:border-accent hover:text-accent disabled:opacity-60"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "text-right" : ""}>
                <div
                  className={`inline-block max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm ${
                    m.role === "user" ? "bg-accent text-white" : "bg-bg border border-border"
                  }`}
                >
                  {m.content || (streaming ? "…" : "")}
                </div>
              </div>
            ))}
          </div>
          {(streaming || lastStats) && (
            <div className="border-t border-border px-4 py-1.5 text-center font-mono text-xs text-muted">
              {lastStats && !streaming
                ? `${lastStats.tokens} tok · ${lastStats.ttftMs} ms to first token · ${lastStats.tokPerSec.toFixed(1)} tok/s`
                : `generating… ${liveTokens} tok`}
            </div>
          )}
          <div className="border-t border-border p-3">
            {turnstileEnabled && (
              <div className="mb-2 flex justify-center">
                <Turnstile onToken={setToken} resetSignal={tsReset} />
              </div>
            )}
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="Type a message…"
                maxLength={4000}
                className="flex-1 rounded-md border border-border bg-bg px-3 py-2 text-sm focus:border-accent focus:outline-none"
              />
              <button
                onClick={() => send()}
                disabled={streaming || !input.trim() || (turnstileEnabled && !token)}
                className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
              >
                {streaming ? "…" : "Send"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="font-mono">{value}</dd>
    </div>
  );
}

function appendToLast(setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>, chunk: string) {
  setMessages((prev) => {
    const copy = [...prev];
    const last = copy[copy.length - 1];
    if (last && last.role === "assistant") {
      copy[copy.length - 1] = { ...last, content: last.content + chunk };
    }
    return copy;
  });
}
