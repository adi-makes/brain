import Link from "next/link";
import { signOut } from "../../src/auth/actions";
import { readAuthView } from "../../src/auth/view";

export default async function AccountPage() {
  const auth = await readAuthView();

  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 py-8">
      <h1 className="text-2xl font-medium tracking-tight text-ink">Account</h1>
      {auth.status === "unconfigured" ? (
        <p className="mt-4 text-sm text-ink">
          Supabase is not configured, so there is no session to refresh. The workspace fixtures
          remain local.
        </p>
      ) : null}
      {auth.status === "anonymous" ? (
        <p className="mt-4 text-sm text-ink">
          You are not signed in.{" "}
          <Link className="underline" href="/sign-in">
            Sign in
          </Link>
        </p>
      ) : null}
      {auth.status === "error" ? (
        <p className="mt-4 text-sm text-danger" role="alert">
          {auth.message}
        </p>
      ) : null}
      {auth.status === "ready" ? (
        <div className="mt-4 space-y-3 text-sm text-ink">
          <p>{auth.account.email}</p>
          <p>
            {auth.account.verified
              ? "Email is confirmed."
              : "Email is not confirmed yet. The workspace still works."}
          </p>
          <p>
            {auth.account.aiPermitted
              ? "Assistant proposals are allowed for this account."
              : "Assistant proposals stay off. That does not block the calendar or lists."}
          </p>
          <form action={signOut}>
            <button
              type="submit"
              className="cursor-pointer min-h-11 rounded-[10px] border border-line px-4 text-sm"
            >
              Sign out
            </button>
          </form>
        </div>
      ) : null}
    </main>
  );
}
