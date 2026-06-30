import type { Metadata } from "next";
import { site } from "@/lib/site";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = {
  title: "About Me",
  description: "Kobe Young — from Navy avionics to software engineering, cloud to systems.",
};

export default function AboutPage() {
  return (
    <div>
      <PageHeader eyebrow="~/about" title="About Me" />
      <div className="prose mt-8">
      <p>
        I&apos;m {site.name} — a software engineer with roughly three years of production
        experience and a U.S. Navy background in avionics. I&apos;m finishing a B.S. in
        Computer Science while building systems that sit close to the metal: real-time data
        pipelines, retrieval-augmented LLM serving, and distributed backends on AWS and Azure.
      </p>

      <h2>From avionics to engineering</h2>
      <p>
        In the Navy I maintained and troubleshot aircraft avionics — disciplined,
        consequence-aware work where a wrong call has real cost. That habit of methodical
        debugging and ownership carried directly into software. I started in cloud
        application work and kept pulling the thread downward: from services, to the data
        moving through them, to the inference engines serving models.
      </p>

      <h2>What I&apos;m focused on now</h2>
      <p>
        I&apos;m going deeper into systems and inference — currently building a minimal
        inference engine to self-host open-source LLMs, which powers the{" "}
        <a href="/chat">live demo</a> on this site. I care about latency, correctness under
        load, and software that&apos;s secure by default.
      </p>

      <h2>Beyond the resume</h2>
      <p>
        I value clear writing (hence the <a href="/blog">writeups</a>), measurable results,
        and tools that respect the people using them. If you&apos;re hiring for backend,
        data, or ML-systems work, I&apos;d love to talk — <a href="/contact">reach out</a>.
      </p>
      </div>
    </div>
  );
}
