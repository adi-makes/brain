import Link from "next/link";
import { AuthForm } from "../../src/components/AuthForm";
import { readPublicSupabaseConfig } from "../../src/auth/env";

export default function SignUpPage() {
  const configured = readPublicSupabaseConfig() !== null;
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-8">
      <h1 className="text-2xl font-medium tracking-tight text-ink">Create an account</h1>
      <p className="mt-2 text-sm text-muted">
        Email confirmation is separate from assistant permission. You can use the workspace without
        either.
      </p>
      {configured ? (
        <AuthForm mode="sign-up" next="/account" />
      ) : (
        <p className="mt-6 text-sm text-ink">
          Supabase is not configured. Add the project URL and anon key to the root <code>.env</code>{" "}
          before creating an account.
        </p>
      )}
      <p className="mt-6 text-sm text-muted">
        <Link className="text-ink underline" href="/sign-in">
          Sign in
        </Link>
      </p>
    </main>
  );
}
