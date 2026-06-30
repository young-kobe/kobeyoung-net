import Link from "next/link";
import { DecodeText } from "@/components/DecodeText";

export default function NotFound() {
  return (
    <div className="py-20 text-center">
      <p className="eyebrow">404 · not found</p>
      <DecodeText
        as="h1"
        text="Page not found"
        className="mt-3 inline-block font-display text-3xl font-bold tracking-tight"
      />
      <p className="mt-2 text-muted">That page doesn&apos;t exist or has moved.</p>
      <Link href="/" className="mt-6 inline-block rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90">
        Back home
      </Link>
    </div>
  );
}
