import { NextResponse, type NextRequest } from "next/server";
import { safeNextPath } from "../../../src/auth/redirect";
import { createServerSupabase } from "../../../src/lib/supabase/server";

export async function GET(request: NextRequest) {
  const next = safeNextPath(request.nextUrl.searchParams.get("next"));
  const code = request.nextUrl.searchParams.get("code");
  const destination = new URL(next, request.url);
  if (!code) return NextResponse.redirect(destination);
  const supabase = await createServerSupabase();
  if (!supabase) return NextResponse.redirect(new URL("/sign-in", request.url));
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    const failed = new URL("/sign-in", request.url);
    failed.searchParams.set("notice", "link-expired");
    return NextResponse.redirect(failed);
  }
  return NextResponse.redirect(destination);
}
