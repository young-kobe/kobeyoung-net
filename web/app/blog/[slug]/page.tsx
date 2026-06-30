import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getPost, getPosts, formatDate } from "@/lib/content";
import { MdxContent } from "@/components/MdxContent";
import { Tag } from "@/components/ui";

export function generateStaticParams() {
  return getPosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};
  const { title, summary, date, hero } = post.frontmatter;
  return {
    title,
    description: summary,
    openGraph: {
      title,
      description: summary,
      type: "article",
      publishedTime: date,
      images: hero ? [hero] : undefined,
    },
  };
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();
  const fm = post.frontmatter;

  return (
    <article>
      <Link href="/blog" className="text-sm text-accent hover:underline">← All writeups</Link>
      <header className="mt-4">
        <h1 className="text-3xl font-bold tracking-tight">{fm.title}</h1>
        <div className="mt-2 text-sm text-muted">
          {formatDate(fm.date)} · {post.readingMinutes} min read
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {fm.tags.map((t) => (
            <Tag key={t}>{t}</Tag>
          ))}
        </div>
      </header>
      <div className="prose mt-8">
        <MdxContent source={post.body} />
      </div>
    </article>
  );
}
