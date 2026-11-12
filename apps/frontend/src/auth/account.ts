export type AccountState =
  | { kind: "anonymous" }
  | { kind: "authenticated"; email: string; verified: boolean; aiPermitted: boolean };

export function classifyAccount(
  input: {
    email: string | null;
    emailConfirmedAt: string | null;
    aiPermitted: boolean;
  } | null,
): AccountState {
  if (!input) return { kind: "anonymous" };
  return {
    kind: "authenticated",
    email: input.email ?? "",
    verified: Boolean(input.emailConfirmedAt),
    aiPermitted: input.aiPermitted,
  };
}

export function accountLabel(state: AccountState): string {
  if (state.kind === "anonymous") return "Sign in";
  return state.email || "Account";
}
