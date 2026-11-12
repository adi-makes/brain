import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Page not found</h1>
      <p className="mt-4 text-neutral-800">That page is not part of this build.</p>
      <p className="mt-6">
        <Link className="underline" href="/">
          Back to the foundation page
        </Link>
      </p>
    </main>
  );
}
