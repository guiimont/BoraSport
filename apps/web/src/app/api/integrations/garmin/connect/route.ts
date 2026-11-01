import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { GARMIN_AUTHORIZE_URL, assertGarminIntegrationReady } from "../../../../../lib/integrations/garmin";
import { createClient } from "../../../../../lib/saas/supabase-server";

const cookieOptions = { httpOnly: true, maxAge: 600, path: "/", sameSite: "lax" as const, secure: process.env.NODE_ENV === "production" };

export async function GET(request: Request) {
  try {
    assertGarminIntegrationReady();
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.redirect(new URL("/login?next=/perfil", request.url));
    const state = randomBytes(24).toString("base64url");
    const verifier = randomBytes(32).toString("base64url");
    const challenge = createHash("sha256").update(verifier).digest("base64url");
    const cookieStore = await cookies();
    cookieStore.set("garmin_oauth_state", state, cookieOptions);
    cookieStore.set("garmin_pkce_verifier", verifier, cookieOptions);
    const authorize = new URL(GARMIN_AUTHORIZE_URL);
    authorize.searchParams.set("response_type", "code");
    authorize.searchParams.set("client_id", process.env.GARMIN_CLIENT_ID!);
    authorize.searchParams.set("redirect_uri", process.env.GARMIN_REDIRECT_URI!);
    authorize.searchParams.set("code_challenge", challenge);
    authorize.searchParams.set("code_challenge_method", "S256");
    authorize.searchParams.set("state", state);
    return NextResponse.redirect(authorize);
  } catch {
    return NextResponse.redirect(new URL("/perfil?garmin=configuration-error", request.url));
  }
}
