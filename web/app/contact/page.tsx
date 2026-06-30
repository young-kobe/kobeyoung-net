import type { Metadata } from "next";
import { ContactForm } from "@/components/ContactForm";
import { site } from "@/lib/site";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with Kobe Young.",
};

export default function ContactPage() {
  return (
    <div className="max-w-xl">
      <PageHeader eyebrow="~/contact" title="Contact" />
      <p className="mt-4 text-muted">
        Hiring, collaboration, or questions about my work — send a note and it lands in my
        inbox. You can also reach me on{" "}
        <a href={site.socials.github} className="text-accent hover:underline" target="_blank" rel="noopener noreferrer">
          GitHub
        </a>{" "}
        or{" "}
        <a href={site.socials.linkedin} className="text-accent hover:underline" target="_blank" rel="noopener noreferrer">
          LinkedIn
        </a>
        .
      </p>
      <div className="mt-8">
        <ContactForm />
      </div>
    </div>
  );
}
