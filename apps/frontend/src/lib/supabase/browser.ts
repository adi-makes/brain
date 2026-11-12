"use client";

import { createBrowserClient } from "@supabase/ssr";
import { readPublicSupabaseConfig } from "../../auth/env";
import type { Database } from "../database.types";

export function createBrowserSupabase() {
  const config = readPublicSupabaseConfig();
  if (!config) return null;
  return createBrowserClient<Database>(config.url, config.anonKey);
}
