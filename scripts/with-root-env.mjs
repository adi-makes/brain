#!/usr/bin/env node
/**
 * Load the root .env file into the child process environment.
 * Existing variables win, so CI secrets and an explicit shell override stay put.
 * Values are not printed.
 */

import { spawn } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envFile = path.join(root, ".env");

function parseEnv(contents) {
  const values = new Map();
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }
    const separator = line.indexOf("=");
    if (separator <= 0) {
      continue;
    }
    const key = line.slice(0, separator).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
      continue;
    }
    let value = line.slice(separator + 1);
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values.set(key, value);
  }
  return values;
}

function applyRootEnv() {
  if (!existsSync(envFile)) {
    process.stderr.write(
      "with-root-env: root .env is absent; continuing with the current environment\n",
    );
    return;
  }
  const parsed = parseEnv(readFileSync(envFile, "utf8"));
  for (const [key, value] of parsed) {
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
  if (process.env.SECOND_BRAIN_ENV_FILE === undefined) {
    process.env.SECOND_BRAIN_ENV_FILE = envFile;
  }
}

const argv = process.argv.slice(2);
if (argv.length === 0) {
  process.stderr.write("usage: node scripts/with-root-env.mjs <command> [args...]\n");
  process.exit(1);
}

applyRootEnv();

const child = spawn(argv[0], argv.slice(1), {
  cwd: root,
  env: process.env,
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
