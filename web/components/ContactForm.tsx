"use client";

import { useEffect, useRef, useState } from "react";
import { apiUrl } from "@/lib/site";
import { Turnstile, turnstileEnabled } from "./Turnstile";
import type { ContactRequest, ContactResponse } from "@contract/api";

type State = "idle" | "submitting" | "success" | "error";

export function ContactForm() {
  const [state, setState] = useState<State>("idle");
  const [message, setMessage] = useState("");
  const [token, setToken] = useState("");
  const renderedAt = useRef<number>(0);

  // Stamp the render time on mount — the backend's time-trap rejects sub-2s submits.
  useEffect(() => {
    renderedAt.current = Date.now();
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("submitting");
    const form = e.currentTarget;
    const data = new FormData(form);

    const payload: ContactRequest = {
      name: String(data.get("name") || ""),
      email: String(data.get("email") || ""),
      message: String(data.get("message") || ""),
      company: String(data.get("company") || ""), // honeypot
      renderedAt: renderedAt.current,
      turnstileToken: token || undefined,
    };

    if (turnstileEnabled && !token) {
      setState("error");
      setMessage("Please complete the verification challenge.");
      return;
    }

    try {
      const res = await fetch(`${apiUrl}/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await res.json()) as ContactResponse;
      if (body.ok) {
        setState("success");
        setMessage(body.message);
        form.reset();
      } else {
        setState("error");
        setMessage(body.message || "Something went wrong.");
      }
    } catch {
      setState("error");
      setMessage("Network error. Please try again.");
    }
  }

  if (state === "success") {
    return (
      <div role="status" className="rounded-lg border border-green-500/40 bg-green-500/5 p-6">
        <p className="font-medium">Message sent ✓</p>
        <p className="mt-1 text-sm text-muted">{message}</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <Field label="Name" htmlFor="name">
        <input id="name" name="name" type="text" required maxLength={100} autoComplete="name" className={inputClass} />
      </Field>
      <Field label="Email" htmlFor="email">
        <input id="email" name="email" type="email" required maxLength={254} autoComplete="email" className={inputClass} />
      </Field>
      <Field label="Message" htmlFor="message">
        <textarea id="message" name="message" required maxLength={5000} rows={6} className={inputClass} />
      </Field>

      {/* Honeypot — hidden from humans (and assistive tech). Bots fill it; server drops it. */}
      <div aria-hidden className="absolute left-[-9999px] top-[-9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="company">Company (leave blank)</label>
        <input id="company" name="company" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      {turnstileEnabled && <Turnstile onToken={setToken} />}

      {state === "error" && (
        <p role="alert" className="text-sm text-red-500">{message}</p>
      )}

      <button
        type="submit"
        disabled={state === "submitting"}
        className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60 transition-opacity"
      >
        {state === "submitting" ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}

const inputClass =
  "w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus:border-accent focus:outline-none";

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}
