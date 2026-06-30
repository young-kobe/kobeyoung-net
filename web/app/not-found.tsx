import Link from "next/link";

export default function NotFound() {
  return (
    <div className="py-20 text-center">
      <p className="eyebrow">404 · not found</p>
      <h1 className="mt-3 font-display text-3xl font-bold tracking-tight">Page not found</h1>
      <p className="mt-2 text-muted">That page doesn&apos;t exist or has moved.</p>
      <Link href="/" className="mt-6 inline-block rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90">
        Back home
      </Link>
    </div>
  );
}
