import type { Metadata } from "next";
import { headers } from "next/headers";
import localFont from "next/font/local";
import "./globals.css";
import { site } from "@/lib/site";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";

// Fonts ship as committed .woff2 in app/fonts (SIL OFL) and load via next/font/local,
// so the build is hermetic (no fetch from Google) and they're still served from 'self'.
// Display carries the personality; mono is the page's "data voice"; Inter sets body text.
const display = localFont({
  src: [
    { path: "./fonts/space-grotesk-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/space-grotesk-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-display",
  display: "swap",
});
const mono = localFont({
  src: [
    { path: "./fonts/jetbrains-mono-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/jetbrains-mono-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/jetbrains-mono-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-mono",
  display: "swap",
});
const sans = localFont({
  src: "./fonts/inter-variable.woff2",
  weight: "100 900",
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: site.title, template: `%s · ${site.name}` },
  description: site.description,
  openGraph: {
    type: "website",
    siteName: site.name,
    title: site.title,
    description: site.description,
    url: site.url,
    locale: site.locale,
  },
  twitter: { card: "summary_large_image", title: site.title, description: site.description },
  alternates: { types: { "application/rss+xml": "/rss.xml" } },
  robots: { index: true, follow: true },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
};

// Set the theme before first paint to avoid a flash. Uses the CSP nonce so it passes
// the strict script-src policy.
const themeScript = `
(function(){try{
  var t = localStorage.getItem('theme');
  var m = window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (t === 'dark' || (!t && m)) document.documentElement.classList.add('dark');
}catch(e){}})();
`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <html lang="en" className={`${display.variable} ${mono.variable} ${sans.variable}`} suppressHydrationWarning>
      <head>
        {/* Browsers clear the nonce content attribute after load ("nonce hiding"),
            so the hydrated DOM shows nonce="" while SSR emitted the value — an
            expected, harmless mismatch on this one element. */}
        <script
          nonce={nonce}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: themeScript }}
        />
        {/* Without JS, scroll-reveal content must never stay hidden. */}
        <noscript>
          <style>{`.reveal{opacity:1 !important;transform:none !important}`}</style>
        </noscript>
      </head>
      <body className="min-h-screen flex flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-accent focus:px-3 focus:py-2 focus:text-white"
        >
          Skip to content
        </a>
        <Nav />
        <main id="main" className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-10">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
