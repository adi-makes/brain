"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createServerSupabase } from "../lib/supabase/server";
import { safeNextPath } from "./redirect";

export type AuthActionState = { error: string } | null;

async function sameOrigin(): Promise<boolean> {
  const headerStore = await headers();
  const origin = headerStore.get("origin");
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function signIn(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  if (!(await sameOrigin())) return { error: "The sign-in request did not come from this site." };
  const supabase = await createServerSupabase();
  if (!supabase) return { error: "Supabase is not configured." };
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeNextPath(formData.get("next"));
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "Email or password was not accepted." };
  redirect(next);
}

export async function signUp(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  if (!(await sameOrigin())) return { error: "The sign-up request did not come from this site." };
  const supabase = await createServerSupabase();
  if (!supabase) return { error: "Supabase is not configured." };
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const origin = (await headers()).get("origin") ?? "http://127.0.0.1:3000";
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${origin}/auth/callback?next=/account` },
  });
  if (error) return { error: "The account could not be created." };
  redirect("/sign-in?notice=check-email");
}

export async function signOut(): Promise<void> {
  if (!(await sameOrigin())) return;
  const supabase = await createServerSupabase();
  if (supabase) await supabase.auth.signOut();
  redirect("/");
}
