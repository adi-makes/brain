import { underDevelopmentMessage } from "../src/copy";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-16">
      <p className="text-sm text-neutral-600">Phase 00</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Second Brain</h1>
      <p className="mt-4 text-lg text-neutral-800">{underDevelopmentMessage()}</p>
      <p className="mt-6 text-sm text-neutral-600">
        <a className="underline" href="/api/health">
          Service health
        </a>
      </p>
    </main>
  );
}
