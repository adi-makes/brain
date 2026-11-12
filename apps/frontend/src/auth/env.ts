export type PublicSupabaseConfig = {
  url: string;
  anonKey: string;
};

export function readPublicSupabaseConfig(
  env: Record<string, string | undefined> = process.env,
): PublicSupabaseConfig | null {
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";
  if (!url || !anonKey) return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
  if (
    parsed.protocol === "http:" &&
    parsed.hostname !== "127.0.0.1" &&
    parsed.hostname !== "localhost"
  ) {
    return null;
  }
  return { url, anonKey };
}
