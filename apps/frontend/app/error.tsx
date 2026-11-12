"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Something went wrong</h1>
      <p className="mt-4 text-neutral-800">The page could not be displayed.</p>
      <button
        className="mt-6 w-fit border border-neutral-400 px-4 py-2 text-sm"
        type="button"
        onClick={() => reset()}
      >
        Try again
      </button>
    </main>
  );
}
