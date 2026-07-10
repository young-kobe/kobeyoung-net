import type { MetadataRoute } from "next";
import { site } from "@/lib/site";
import { getWriteups, getPosts } from "@/lib/content";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = site.url;
  const staticRoutes = ["", "/writeups", "/chat", "/about", "/contact"].map((p) => ({
    url: `${base}${p}`,
    lastModified: new Date(),
  }));

  const writeups = getWriteups().map((p) => ({
    url: `${base}/writeups/${p.slug}`,
    lastModified: new Date(p.frontmatter.date),
  }));

  const posts = getPosts().map((p) => ({
    url: `${base}/blog/${p.slug}`,
    lastModified: new Date(p.frontmatter.date),
  }));

  return [...staticRoutes, ...writeups, ...posts];
}
