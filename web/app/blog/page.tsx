import type { Metadata } from "next";
import Link from "next/link";
import { getPosts, formatDate } from "@/lib/content";
import { PageHeader, Tag } from "@/components/ui";

export const metadata: Metadata = {
  title: "Blog posts",
  description: "Blog posts and other writing ventures authored by me",
};

export default function BlogPage() {
  const posts = getPosts();
  return (
    <div>
      <PageHeader
        eyebrow="~/blog"
        title="Blog Posts"
        lead="Blog posts and other writing ventures authored by me."
      />
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
    </div>
  );
}
