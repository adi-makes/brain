#!/usr/bin/env node
/**
 * Confirm the checked-in database types name every table created by migrations.
 * Regenerate the file with `pnpm db:types` after a local Supabase database is running.
 */

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const migrationsDir = path.join(root, "supabase", "migrations");
const typesFile = path.join(root, "apps", "frontend", "src", "lib", "database.types.ts");

const sql = readdirSync(migrationsDir)
  .filter((name) => name.endsWith(".sql"))
  .map((name) => readFileSync(path.join(migrationsDir, name), "utf8"))
  .join("\n");
const tables = [...sql.matchAll(/create table public\.([a-z_]+)/g)].map((match) => match[1]);
const types = readFileSync(typesFile, "utf8");
const missing = tables.filter(
  (table) => !types.includes(`"${table}":`) && !types.includes(`${table}:`),
);

if (tables.length === 0) {
  console.error("no tables found in supabase/migrations");
  process.exit(1);
}
if (missing.length > 0) {
  console.error(`database types are missing: ${missing.join(", ")}`);
  process.exit(1);
}
console.log(`database types cover ${tables.length} tables`);
