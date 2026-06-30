import Link from "next/link";
import { site } from "@/lib/site";
import { getProjects } from "@/lib/content";
import { getPosts } from "@/lib/content";
import { CardLink, StatusBadge } from "@/components/ui";
import { formatDate } from "@/lib/content";

export default function HomePage() {
  const projects = getProjects().slice(0, 3);
  const posts = getPosts().slice(0, 3);

  return (
    <div className="space-y-16">
      {/* Hero */}
      <section className="pt-6">
        <p className="text-sm font-medium text-accent">Software Engineer · U.S. Navy Veteran</p>
        <h1 className="mt-3 text-4xl sm:text-5xl font-bold tracking-tight">
          Builder of real-time data pipelines and LLM systems. Owner of multiple cats. 
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-muted">
          {site.name} — 3 years shipping production data pipelines, RAG/LLM serving, and
          distributed backends on AWS/Azure. Former Navy avionics technician and residentail electrician, current software engineer,
          wanting to enter the world of systems and inference.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link
            href="/projects"
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity"
          >
            View projects
          </Link>
          <Link
            href="/chat"
            className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:border-accent transition-colors"
          >
            Try KobeLLm
          </Link>
          <a
            href={site.socials.resume}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:border-accent transition-colors"
          >
            Résumé (PDF)
          </a>
        </div>
        <div className="mt-6 flex gap-4 text-sm text-muted">
          <a href={site.socials.github} className="hover:text-fg" target="_blank" rel="noopener noreferrer">GitHub</a>
          <a href={site.socials.linkedin} className="hover:text-fg" target="_blank" rel="noopener noreferrer">LinkedIn</a>
          <Link href="/contact" className="hover:text-fg">Contact</Link>
        </div>
      </section>

      {/* Featured projects */}
      <section>
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-semibold tracking-tight">Featured projects</h2>
          <Link href="/projects" className="text-sm text-accent hover:underline">All projects →</Link>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <CardLink key={p.slug} href={`/projects/${p.slug}`} title={p.frontmatter.title}>
              <div className="mt-2"><StatusBadge status={p.frontmatter.status} /></div>
              <p className="mt-3 text-sm text-muted">{p.frontmatter.summary}</p>
            </CardLink>
          ))}
        </div>
      </section>

      {/* Recent writeups */}
      <section>
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-semibold tracking-tight">Recent writeups</h2>
          <Link href="/blog" className="text-sm text-accent hover:underline">All writeups →</Link>
        </div>
        <ul className="mt-5 divide-y divide-border">
          {posts.map((post) => (
            <li key={post.slug}>
              <Link href={`/blog/${post.slug}`} className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1 py-4 hover:text-accent transition-colors">
                <span className="font-medium">{post.frontmatter.title}</span>
                <span className="text-sm text-muted">{formatDate(post.frontmatter.date)} · {post.readingMinutes} min</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
