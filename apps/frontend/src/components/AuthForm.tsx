"use client";

import { useActionState } from "react";
import { signIn, signUp, type AuthActionState } from "../auth/actions";

export function AuthForm({ mode, next }: { mode: "sign-in" | "sign-up"; next: string }) {
  const action = mode === "sign-in" ? signIn : signUp;
  const [state, formAction, pending] = useActionState<AuthActionState, FormData>(action, null);

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <input type="hidden" name="next" value={next} />
      <label className="block text-sm text-ink" htmlFor="email">
        Email
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="mt-1 min-h-11 w-full rounded-[10px] border border-line bg-surface px-3 text-sm"
        />
      </label>
      <label className="block text-sm text-ink" htmlFor="password">
        Password
        <input
          id="password"
          name="password"
          type="password"
          autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
          minLength={8}
          required
          className="mt-1 min-h-11 w-full rounded-[10px] border border-line bg-surface px-3 text-sm"
        />
      </label>
      {state?.error ? (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="cursor-pointer min-h-11 rounded-[10px] bg-accent px-4 text-sm text-canvas disabled:cursor-wait disabled:opacity-70"
      >
        {pending ? "Sending…" : mode === "sign-in" ? "Sign in" : "Create account"}
      </button>
    </form>
  );
}
