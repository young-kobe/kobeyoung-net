/** Central site metadata. Edit here to update SEO defaults, nav, and social links. */
export const site = {
  // `name` is the wordmark/author used in the SEO title template, footer, and prose.
  name: "Kobe Young",
  // `title` is the homepage <title> and default OG title.
  title: "Kobe Young · Software & Systems Engineer",
  description:
    "Software engineer and U.S. Navy avionics veteran. Real-time data pipelines, RAG/LLM serving, and distributed backends on AWS/Azure.",
  url: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  locale: "en_US",
  author: "Kobe Young",
  email: "kobe.tyler.young@gmail.com",
  socials: {
    github: "https://github.com/young-kobe",
    linkedin: "https://www.linkedin.com/in/",
    resume: "/resume.pdf",
  },
  nav: [
    { href: "/writeups", label: "Writeups" },
    { href: "https://civic-lens.info", label: "Civic Lens", external: true },
    { href: "/blog", label: "Blog" },
    { href: "/chat", label: "KobeLLM" },
    { href: "/gateway", label: "Gateway Chat" },
    { href: "/about", label: "About Me" },
    { href: "/contact", label: "Contact" },
  ] as ReadonlyArray<{ href: string; label: string; external?: boolean }>,
} as const;

/** Base URL of the Go backend. Public (URL only — never a secret). */
export const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
