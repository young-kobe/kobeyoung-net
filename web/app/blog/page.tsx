import type { Metadata } from "next";
import Link from "next/link";
import { getPosts, formatDate } from "@/lib/content";
import { PageHeader, Tag } from "@/components/ui";

export const metadata: Metadata = {
  title: "Blog",
  description: "Longer-form writing in my own voice. Project writeups live under /writeups.",
};

/** Terminal-styled empty state — the blog is intentionally empty until I write the first post. */
function EmptyBlog() {
  return (
    <div className="mt-10 rounded-lg border border-border bg-surface/70 p-5 font-mono text-sm leading-relaxed">
      <div>
        <span className="text-accent2">kobe</span>
        <span className="text-muted">@kobeyoung.net</span>
        <span className="text-muted">:</span>
        <span className="text-accent">~/blog</span>
        <span className="text-muted"> $ ls posts/</span>
      </div>
      <div className="mt-1 text-muted">ls: cannot access &apos;posts/&apos;: no entries yet</div>
      <div className="mt-4 text-fg">
        coming soon
        <span className="caret">▋</span>
      </div>
    </div>
  );
}

export default function BlogPage() {
  const posts = getPosts();
  return (
    <div>
      <PageHeader
        eyebrow="~/blog"
        title="Blog"
        lead="Longer-form writing in my own voice. For technical deep-dives, see the writeups under /writeups."
      />
      {posts.length === 0 ? (
        <EmptyBlog />
      ) : (
        <ul className="mt-10 space-y-8">
          {posts.map((post) => (
            <li key={post.slug}>
              <Link href={`/blog/${post.slug}`} className="group">
                <h2 className="font-display text-xl font-bold tracking-tight transition-colors group-hover:text-accent">
                  {post.frontmatter.title}
                </h2>
              </Link>
              <div className="mt-1 text-sm text-muted">
                {formatDate(post.frontmatter.date)} · {post.readingMinutes} min read
              </div>
              <p className="mt-2 text-muted">{post.frontmatter.summary}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {post.frontmatter.tags.map((t) => (
                  <Tag key={t}>{t}</Tag>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
