import type { MetadataRoute } from "next";
import { site } from "@/lib/site";
import { getProjects, getPosts } from "@/lib/content";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = site.url;
  const staticRoutes = ["", "/projects", "/chat", "/about", "/contact"].map((p) => ({
    url: `${base}${p}`,
    lastModified: new Date(),
  }));

  const projects = getProjects().map((p) => ({
    url: `${base}/projects/${p.slug}`,
    lastModified: new Date(p.frontmatter.date),
  }));

  const posts = getPosts().map((p) => ({
    url: `${base}/blog/${p.slug}`,
    lastModified: new Date(p.frontmatter.date),
  }));

  return [...staticRoutes, ...projects, ...posts];
}
