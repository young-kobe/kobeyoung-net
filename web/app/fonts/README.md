# Bundled fonts

These `.woff2` files are committed so the production build is **hermetic** — `next/font/local`
reads them from disk, so the build never fetches from Google. They're still served from
`/_next/static/media` (same-origin), so the strict CSP (`font-src 'self'`) is unaffected.

All three families are licensed under the **SIL Open Font License 1.1**, which permits
bundling and redistribution:

| File(s) | Family | Source |
|---|---|---|
| `space-grotesk-{500,700}.woff2` | Space Grotesk | Fontsource (`space-grotesk@5`) |
| `jetbrains-mono-{400,500,700}.woff2` | JetBrains Mono | Fontsource (`jetbrains-mono@5`) |
| `inter-variable.woff2` | Inter (variable, wght) | Fontsource (`inter:vf@5`) |

To change weights, update the `localFont` calls in `app/layout.tsx` and add the matching
`latin-<weight>-normal.woff2` from `https://cdn.jsdelivr.net/fontsource/fonts/<family>@5/`.
