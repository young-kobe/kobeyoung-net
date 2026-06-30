# Content (git-as-CMS)

All projects and writeups are MDX files in this folder. **Adding one = dropping in a new
`.mdx` file.** No database, no CMS. Frontmatter is validated at build time — a malformed
file fails the build instead of shipping broken.

## Projects — `content/projects/<slug>.mdx`

```yaml
---
title: Real-Time RAG Pipeline        # required
date: 2026-05-12                      # required, ISO yyyy-mm-dd (used for sorting)
summary: One-sentence description.   # required (cards + SEO)
status: shipped                      # required: shipped | in-progress | planned
tags: [Go, RAG, AWS]                 # optional
hero: /images/rag-hero.png           # optional (OpenGraph + future hero)
repo: https://github.com/you/repo    # optional
demo: /demo                          # optional
updates:                             # optional dated log, newest first
  - date: 2026-05-12
    note: Shipped v1.
---
```

The slug (filename without `.mdx`) becomes the URL: `/projects/<slug>`.

## Writeups — `content/blog/<slug>.mdx`

```yaml
---
title: Streaming LLM Tokens Over SSE   # required
date: 2026-06-01                       # required
summary: Short description.            # required
tags: [LLM, SSE, Go]                   # optional
hero: /images/sse.png                  # optional
draft: false                           # optional — true hides it from lists/RSS
---
```

URL: `/blog/<slug>`. Reading time is computed automatically.

## Components you can use in MDX

These are available without importing (registered in `components/mdx.tsx`):

- `<Callout type="note|warn|tip">…</Callout>` — highlighted aside.
- `<Figure src="/img.png" alt="…" caption="…" />` — image with caption.
- `<BarChart title="…" unit="ms" data={[{label, value}]} />` — dependency-free bar chart.
- `<Metrics caption="…" rows={[{metric, value, note}]} />` — metrics table.
- Fenced code blocks ` ```go ` get syntax highlighting + a copy button automatically.

Images referenced by `src` should live in `web/public/` (e.g. `public/images/...`), since
the Content-Security-Policy restricts `img-src` to the site's own origin. An external URL
in `hero`/`<Figure src>` will silently fail to load — by design, not a bug.

## Security: MDX is trusted-author input

MDX compiles to JSX and can execute JS at build/SSR time. That's fine **because every file
here is authored by you and committed to git** — it is never user-submitted content. The
nonce-based CSP would also block any injected inline `<script>` at runtime. Hard rule:
**never render user-submitted text through `MDXRemote`/`MdxContent`.** User input (e.g. the
contact form) is email-only and is never reflected into a page.
