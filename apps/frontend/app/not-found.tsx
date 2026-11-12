import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-col px-6 py-16">
      <h1 className="text-2xl font-medium tracking-tight text-ink">Page not found</h1>
      <p className="mt-4 text-sm text-muted">That page is not part of this prototype.</p>
      <p className="mt-6">
        <Link className="text-sm text-ink underline" href="/">
          Back to the workspace
        </Link>
      </p>
    </main>
  );
}
