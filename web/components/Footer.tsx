import { site } from "@/lib/site";

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-border">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted">
        <p>© {year} {site.name}</p>
        <div className="flex items-center gap-4">
          <a href={site.socials.github} className="hover:text-fg transition-colors" target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
          <a href={site.socials.linkedin} className="hover:text-fg transition-colors" target="_blank" rel="noopener noreferrer">
            LinkedIn
          </a>
          <a href={site.socials.resume} className="hover:text-fg transition-colors">
            Resume
          </a>
        </div>
      </div>
    </footer>
  );
}
