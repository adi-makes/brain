#!/usr/bin/env node
/**
 * Fail when an environment file exists outside the repository root, or when a
 * root environment file is not an approved name.
 *
 * Approved root names: `.env`, `.env.example`, and optional `.env.<name>.example`.
 * Dependency and build directories are skipped because third-party packages may
 * ship their own example files. Project source trees are always scanned.
 */

import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SKIP_DIRECTORIES = new Set([
  ".git",
  ".next",
  ".pytest_cache",
  ".ruff_cache",
  ".turbo",
  ".venv",
  "__pycache__",
  "coverage",
  "dist",
  "node_modules",
  "playwright-report",
  "test-results",
]);

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const defaultRoot = path.resolve(scriptDir, "..");

function isEnvFile(name) {
  return name === ".env" || name.startsWith(".env.");
}

function isApprovedRootEnvFile(name) {
  if (name === ".env" || name === ".env.example") {
    return true;
  }
  return /^\.env\.[A-Za-z0-9_-]+\.example$/.test(name);
}

async function walk(directory, root, problems) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRECTORIES.has(entry.name)) {
        continue;
      }
      await walk(fullPath, root, problems);
      continue;
    }
    if (!entry.isFile() || !isEnvFile(entry.name)) {
      continue;
    }
    const relative = path.relative(root, fullPath);
    const atRoot = path.dirname(relative) === ".";
    if (atRoot && isApprovedRootEnvFile(entry.name)) {
      continue;
    }
    problems.push(relative);
  }
}

function parseRoot(argv) {
  const flag = argv.indexOf("--root");
  if (flag === -1) {
    return defaultRoot;
  }
  const value = argv[flag + 1];
  if (!value) {
    throw new Error("--root requires a directory");
  }
  return path.resolve(value);
}

async function main() {
  const root = parseRoot(process.argv.slice(2));
  const rootStat = await stat(root);
  if (!rootStat.isDirectory()) {
    throw new Error(`not a directory: ${root}`);
  }
  const problems = [];
  await walk(root, root, problems);
  if (problems.length > 0) {
    process.stderr.write("env layout check failed:\n");
    for (const problem of problems.sort()) {
      process.stderr.write(`  ${problem}\n`);
    }
    process.exitCode = 1;
    return;
  }
  process.stdout.write(`env layout ok (${root})\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
