import { NextResponse } from "next/server";

import { consumeStoredInvite } from "../../../../lib/saas/invite-session";
import { createClient } from "../../../../lib/saas/supabase-server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/convite", requestUrl.origin));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL("/auth/error", requestUrl.origin));
  }

  const result = await consumeStoredInvite();

  if (result.redirectTo) {
    return NextResponse.redirect(new URL(result.redirectTo, requestUrl.origin));
  }

  return NextResponse.redirect(new URL("/convite", requestUrl.origin));
}
