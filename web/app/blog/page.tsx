import type { Metadata } from "next";
import Link from "next/link";
import { getPosts, formatDate } from "@/lib/content";
import { Tag } from "@/components/ui";

export const metadata: Metadata = {
  title: "Blog posts",
  description: "Blog posts and other writing ventures authored by me",
};

export default function BlogPage() {
  const posts = getPosts();
  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">Blog Posts</h1>
      <p className="mt-2 text-muted">Blog posts and other writing ventures authored by me</p>
      <ul className="mt-8 space-y-8">
        {posts.map((post) => (
          <li key={post.slug}>
            <Link href={`/blog/${post.slug}`} className="group">
              <h2 className="text-xl font-semibold tracking-tight group-hover:text-accent transition-colors">
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
