import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { readPublicSupabaseConfig } from "../../auth/env";

export async function createServerSupabase() {
  const config = readPublicSupabaseConfig();
  if (!config) return null;
  const cookieStore = await cookies();
  return createServerClient(config.url, config.anonKey, {
    cookieOptions: {
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components cannot set cookies. The proxy refreshes the session.
        }
      },
    },
  });
}
