"use client";

import { createBrowserClient } from "@supabase/ssr";
import { readPublicSupabaseConfig } from "../../auth/env";

export function createBrowserSupabase() {
  const config = readPublicSupabaseConfig();
  if (!config) return null;
  return createBrowserClient(config.url, config.anonKey);
}
