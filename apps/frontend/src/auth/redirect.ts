/** Accept only a same-origin relative path. Anything else returns the fallback. */
export function safeNextPath(value: unknown, fallback = "/account"): string {
  if (typeof value !== "string") return fallback;
  if (!value.startsWith("/")) return fallback;
  if (value.startsWith("//") || value.startsWith("/\\")) return fallback;
  if (value.includes("\\") || value.includes("://") || value.includes("\0")) return fallback;
  return value;
}
