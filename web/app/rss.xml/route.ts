import { site } from "@/lib/site";
import { getPosts } from "@/lib/content";

/** RSS 2.0 feed for the writeups. Served at /rss.xml. */
export async function GET() {
  const posts = getPosts();
  const items = posts
    .map((p) => {
      const url = `${site.url}/blog/${p.slug}`;
      return `    <item>
      <title>${escapeXml(p.frontmatter.title)}</title>
      <link>${url}</link>
      <guid>${url}</guid>
      <pubDate>${new Date(p.frontmatter.date).toUTCString()}</pubDate>
      <description>${escapeXml(p.frontmatter.summary)}</description>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(site.name)} · Writeups</title>
    <link>${site.url}/blog</link>
    <description>${escapeXml(site.description)}</description>
    <language>en-us</language>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "s-maxage=3600, stale-while-revalidate",
    },
  });
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
