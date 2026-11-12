import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const checker = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "check-env-layout.mjs");

async function fixture() {
  return mkdtemp(path.join(tmpdir(), "env-layout-"));
}

function run(root) {
  return spawnSync(process.execPath, [checker, "--root", root], { encoding: "utf8" });
}

test("rejects a nested .env file", async () => {
  const root = await fixture();
  try {
    await mkdir(path.join(root, "apps", "frontend"), { recursive: true });
    await writeFile(path.join(root, ".env.example"), "APP_ENV=local\n");
    await writeFile(path.join(root, "apps", "frontend", ".env"), "SECRET=nope\n");
    const result = run(root);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /apps\/frontend\/\.env/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects nested .env.local and .env.production", async () => {
  const root = await fixture();
  try {
    await mkdir(path.join(root, "services", "backend"), { recursive: true });
    await writeFile(path.join(root, "services", "backend", ".env.local"), "A=b\n");
    await writeFile(path.join(root, "services", "backend", ".env.production"), "A=b\n");
    const result = run(root);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /\.env\.local/);
    assert.match(result.stderr, /\.env\.production/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects unapproved root env files", async () => {
  const root = await fixture();
  try {
    await writeFile(path.join(root, ".env.local"), "A=b\n");
    const result = run(root);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /\.env\.local/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("accepts only the approved root env files", async () => {
  const root = await fixture();
  try {
    await writeFile(path.join(root, ".env"), "APP_ENV=local\n");
    await writeFile(path.join(root, ".env.example"), "APP_ENV=local\n");
    await writeFile(path.join(root, ".env.staging.example"), "# documented template\n");
    const result = run(root);
    assert.equal(result.status, 0, result.stderr);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("does not treat dependency directories as project env files", async () => {
  const root = await fixture();
  try {
    await mkdir(path.join(root, "node_modules", "pkg"), { recursive: true });
    await writeFile(path.join(root, "node_modules", "pkg", ".env.example"), "A=b\n");
    await writeFile(path.join(root, ".env.example"), "APP_ENV=local\n");
    const result = run(root);
    assert.equal(result.status, 0, result.stderr);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
