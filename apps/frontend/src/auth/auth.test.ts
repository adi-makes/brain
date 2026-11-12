import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { accountLabel, classifyAccount } from "./account";
import { readPublicSupabaseConfig } from "./env";
import { safeNextPath } from "./redirect";

describe("safeNextPath", () => {
  it("keeps a relative path and rejects off-site targets", () => {
    expect(safeNextPath("/settings")).toBe("/settings");
    expect(safeNextPath("https://evil.example/phish")).toBe("/account");
    expect(safeNextPath("//evil.example")).toBe("/account");
    expect(safeNextPath("/\\evil.example")).toBe("/account");
    expect(safeNextPath(null)).toBe("/account");
  });
});

describe("classifyAccount", () => {
  it("separates anonymous, unverified, verified, and AI permission", () => {
    expect(classifyAccount(null)).toEqual({ kind: "anonymous" });
    const unverified = classifyAccount({
      email: "a@example.test",
      emailConfirmedAt: null,
      aiPermitted: false,
    });
    expect(unverified).toMatchObject({
      kind: "authenticated",
      verified: false,
      aiPermitted: false,
    });
    const verified = classifyAccount({
      email: "a@example.test",
      emailConfirmedAt: "2026-11-12T00:00:00Z",
      aiPermitted: false,
    });
    expect(verified).toMatchObject({ verified: true, aiPermitted: false });
    expect(accountLabel({ kind: "anonymous" })).toBe("Sign in");
  });
});

describe("readPublicSupabaseConfig", () => {
  it("accepts the anon key and rejects a missing or non-http URL", () => {
    expect(
      readPublicSupabaseConfig({
        NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "public-anon",
      }),
    ).toEqual({ url: "http://127.0.0.1:54321", anonKey: "public-anon" });
    expect(
      readPublicSupabaseConfig({
        NEXT_PUBLIC_SUPABASE_URL: "http://example.com",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "public-anon",
      }),
    ).toBeNull();
    expect(readPublicSupabaseConfig({})).toBeNull();
  });
});

describe("service role stays off the frontend", () => {
  it("does not mention the service-role variable in frontend source", () => {
    const root = path.resolve(__dirname, "../..");
    const files = walk(root).filter(
      (file) =>
        (file.endsWith(".ts") || file.endsWith(".tsx")) &&
        !file.includes(`${path.sep}node_modules${path.sep}`) &&
        !file.endsWith(".test.ts"),
    );
    const offenders = files.filter((file) =>
      readFileSync(file, "utf8").includes("SUPABASE_SERVICE_ROLE_KEY"),
    );
    expect(offenders).toEqual([]);
  });
});

function walk(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const full = path.join(directory, name);
    if (name === "node_modules" || name === ".next") return [];
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}
