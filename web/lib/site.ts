/** Central site metadata. Edit here to update SEO defaults, nav, and social links. */
export const site = {
  name: "Kobe Young",
  title: "Kobe's portfolio website",
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
    { href: "/projects", label: "Projects" },
    { href: "/blog", label: "Writeups" },
    { href: "/chat", label: "KobeLLM" },
    { href: "/about", label: "About" },
    { href: "/contact", label: "Contact" },
  ],
} as const;

/** Base URL of the Go backend. Public (URL only — never a secret). */
export const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
