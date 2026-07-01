"use client";

import { DecodeText } from "./DecodeText";

/** Signature element: the headline decodes token-by-token on load, like the model
 *  Kobe builds generating it. */
const HEADLINE = "Software engineer building the systems behind AI and data.";

export function HeroHeadline({ className = "" }: { className?: string }) {
  return <DecodeText as="h1" text={HEADLINE} className={className} speed={85} />;
}
