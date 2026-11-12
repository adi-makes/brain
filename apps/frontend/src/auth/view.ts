import { classifyAccount, type AccountState } from "./account";
import { readPublicSupabaseConfig } from "./env";
import { createServerSupabase } from "../lib/supabase/server";

export type AuthView =
  | { status: "unconfigured" }
  | { status: "anonymous" }
  | { status: "ready"; account: Extract<AccountState, { kind: "authenticated" }> }
  | { status: "error"; message: string };

export async function readAuthView(): Promise<AuthView> {
  if (!readPublicSupabaseConfig()) return { status: "unconfigured" };
  try {
    const supabase = await createServerSupabase();
    if (!supabase) return { status: "unconfigured" };
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return { status: "anonymous" };
    const profile = await supabase
      .from("profiles")
      .select("ai_permitted")
      .eq("id", data.user.id)
      .maybeSingle();
    if (profile.error) {
      return { status: "error", message: "The account record could not be read." };
    }
    const account = classifyAccount({
      email: data.user.email ?? null,
      emailConfirmedAt: data.user.email_confirmed_at ?? null,
      aiPermitted: Boolean(profile.data?.ai_permitted),
    });
    if (account.kind !== "authenticated") return { status: "anonymous" };
    return { status: "ready", account };
  } catch {
    return { status: "error", message: "The account service did not respond." };
  }
}
