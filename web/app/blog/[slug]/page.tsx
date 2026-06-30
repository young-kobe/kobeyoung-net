import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPost, getPosts, formatDate } from "@/lib/content";
import { MdxContent } from "@/components/MdxContent";
import { BackLink, Tag } from "@/components/ui";

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
      <BackLink href="/blog">← all writeups</BackLink>
      <header className="mt-5">
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">{fm.title}</h1>
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
