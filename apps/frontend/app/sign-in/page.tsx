import Link from "next/link";
import { AuthForm } from "../../src/components/AuthForm";
import { readPublicSupabaseConfig } from "../../src/auth/env";
import { safeNextPath } from "../../src/auth/redirect";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; notice?: string }>;
}) {
  const params = await searchParams;
  const next = safeNextPath(params.next);
  const configured = readPublicSupabaseConfig() !== null;
  const notice =
    params.notice === "check-email"
      ? "Check your email to confirm the account. You can keep using the workspace before it is confirmed."
      : params.notice === "link-expired"
        ? "That confirmation link is no longer valid."
        : null;

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-8">
      <h1 className="text-2xl font-medium tracking-tight text-ink">Sign in</h1>
      <p className="mt-2 text-sm text-muted">
        The calendar fixtures stay on this device. Signing in does not upload them.
      </p>
      {notice ? (
        <p className="mt-4 text-sm text-ink" role="status">
          {notice}
        </p>
      ) : null}
      {configured ? (
        <AuthForm mode="sign-in" next={next} />
      ) : (
        <p className="mt-6 text-sm text-ink">
          Supabase is not configured. Add the project URL and anon key to the root <code>.env</code>
          , then restart the app. The steps are in the README.
        </p>
      )}
      <p className="mt-6 text-sm text-muted">
        <Link className="text-ink underline" href="/sign-up">
          Create an account
        </Link>
      </p>
    </main>
  );
}
