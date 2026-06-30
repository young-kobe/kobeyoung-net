"use client";

import { DecodeText } from "./DecodeText";

/** Signature element: the headline decodes token-by-token on load, like the model
 *  Kobe builds generating it. */
const HEADLINE = "Real-time data pipelines, LLM serving, and the systems underneath.";

export function HeroHeadline({ className = "" }: { className?: string }) {
  return <DecodeText as="h1" text={HEADLINE} className={className} speed={85} />;
}
