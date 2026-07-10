/**
 * Git-as-CMS content loader. Writeups and blog posts are MDX files under `content/`.
 * Adding a writeup or post = dropping in one `.mdx` file with valid frontmatter.
 * No database, no external CMS.
 *
 * Frontmatter schema (see WriteupFrontmatter / PostFrontmatter below) is validated at
 * read time; a malformed file fails the build loudly rather than shipping broken pages.
 */
import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";

/** Split an MDX file into its YAML frontmatter and body (replaces `gray-matter`).
 *  `yaml.load` uses js-yaml's default safe schema — no code execution. */
function parseFrontmatter(raw: string): { data: Record<string, any>; content: string } {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(raw);
  if (!m) return { data: {}, content: raw };
  // CORE_SCHEMA keeps ISO dates as strings (DEFAULT_SCHEMA would coerce them to Date).
  const data = (yaml.load(m[1], { schema: yaml.CORE_SCHEMA }) as Record<string, any>) ?? {};
  return { data, content: m[2] };
}

/** Estimate reading time at ~200 words/min (replaces the `reading-time` dependency). */
function readingMinutes(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

const CONTENT_DIR = path.join(process.cwd(), "content");

export type WriteupStatus = "shipped" | "in-progress" | "planned" | "paused";

export interface WriteupFrontmatter {
  title: string;
  date: string; // ISO yyyy-mm-dd
  summary: string;
  status: WriteupStatus;
  tags: string[];
  hero?: string;
  repo?: string;
  demo?: string;
  /** Dated update log, newest first. */
  updates?: { date: string; note: string }[];
}

export interface PostFrontmatter {
  title: string;
  date: string;
  summary: string;
  tags: string[];
  hero?: string;
  draft?: boolean;
}

export interface Doc<T> {
  slug: string;
  frontmatter: T;
  body: string;
  readingMinutes: number;
}

function readDir(sub: string): string[] {
  const dir = path.join(CONTENT_DIR, sub);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith(".mdx"));
}

function readDoc<T>(sub: string, file: string, validate: (fm: any, slug: string) => T): Doc<T> {
  const slug = file.replace(/\.mdx$/, "");
  const raw = fs.readFileSync(path.join(CONTENT_DIR, sub, file), "utf8");
  const { data, content } = parseFrontmatter(raw);
  return {
    slug,
    frontmatter: validate(data, slug),
    body: content,
    readingMinutes: readingMinutes(content),
  };
}

function requireString(fm: any, key: string, slug: string): string {
  const v = fm[key];
  if (typeof v !== "string" || v.trim() === "") {
    throw new Error(`content/${slug}: frontmatter "${key}" must be a non-empty string`);
  }
  return v;
}

function validateWriteup(fm: any, slug: string): WriteupFrontmatter {
  const status = fm.status;
  if (!["shipped", "in-progress", "planned", "paused"].includes(status)) {
    throw new Error(`content/${slug}: status must be shipped | in-progress | planned | paused`);
  }
  return {
    title: requireString(fm, "title", slug),
    date: requireString(fm, "date", slug),
    summary: requireString(fm, "summary", slug),
    status,
    tags: Array.isArray(fm.tags) ? fm.tags.map(String) : [],
    hero: fm.hero,
    repo: fm.repo,
    demo: fm.demo,
    updates: Array.isArray(fm.updates) ? fm.updates : [],
  };
}

function validatePost(fm: any, slug: string): PostFrontmatter {
  return {
    title: requireString(fm, "title", slug),
    date: requireString(fm, "date", slug),
    summary: requireString(fm, "summary", slug),
    tags: Array.isArray(fm.tags) ? fm.tags.map(String) : [],
    hero: fm.hero,
    draft: Boolean(fm.draft),
  };
}

function byDateDesc<T extends { date: string }>(a: Doc<T>, b: Doc<T>) {
  return b.frontmatter.date.localeCompare(a.frontmatter.date);
}

export function getWriteups(): Doc<WriteupFrontmatter>[] {
  return readDir("writeups")
    .map((f) => readDoc("writeups", f, validateWriteup))
    .sort(byDateDesc);
}

export function getWriteup(slug: string): Doc<WriteupFrontmatter> | null {
  const file = `${slug}.mdx`;
  if (!readDir("writeups").includes(file)) return null;
  return readDoc("writeups", file, validateWriteup);
}

export function getPosts(includeDrafts = false): Doc<PostFrontmatter>[] {
  return readDir("blog")
    .map((f) => readDoc("blog", f, validatePost))
    .filter((d) => includeDrafts || !d.frontmatter.draft)
    .sort(byDateDesc);
}

export function getPost(slug: string): Doc<PostFrontmatter> | null {
  const file = `${slug}.mdx`;
  if (!readDir("blog").includes(file)) return null;
  return readDoc("blog", file, validatePost);
}

export function formatDate(iso: string): string {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
