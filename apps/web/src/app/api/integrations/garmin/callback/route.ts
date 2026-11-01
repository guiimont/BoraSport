import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { encryptGarminToken } from "../../../../../lib/integrations/garmin-crypto";
import { GARMIN_TOKEN_URL, assertGarminIntegrationReady } from "../../../../../lib/integrations/garmin";
import { createClient } from "../../../../../lib/saas/supabase-server";

function profileRedirect(request: Request, status: string) {
  return NextResponse.redirect(new URL(`/perfil?garmin=${status}`, request.url));
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (url.searchParams.get("error")) return profileRedirect(request, "denied");

  try {
    assertGarminIntegrationReady();
    const cookieStore = await cookies();
    const expectedState = cookieStore.get("garmin_oauth_state")?.value;
    const verifier = cookieStore.get("garmin_pkce_verifier")?.value;
    cookieStore.delete("garmin_oauth_state");
    cookieStore.delete("garmin_pkce_verifier");
    if (!code || !state || state !== expectedState || !verifier) return profileRedirect(request, "invalid-state");

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return profileRedirect(request, "session-expired");

    const body = new URLSearchParams({ grant_type: "authorization_code", client_id: process.env.GARMIN_CLIENT_ID!, client_secret: process.env.GARMIN_CLIENT_SECRET!, code, code_verifier: verifier, redirect_uri: process.env.GARMIN_REDIRECT_URI! });
    const tokenResponse = await fetch(GARMIN_TOKEN_URL, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body, cache: "no-store" });
    if (!tokenResponse.ok) throw new Error(`Garmin token exchange failed: ${tokenResponse.status}`);
    const tokens = await tokenResponse.json() as { access_token: string; refresh_token?: string; expires_in: number; refresh_token_expires_in?: number; scope?: string };
    if (!tokens.access_token) throw new Error("Garmin did not return an access token");

    let providerUserId: string | null = null;
    const userResponse = await fetch("https://apis.garmin.com/wellness-api/rest/user/id", { headers: { Authorization: `Bearer ${tokens.access_token}` }, cache: "no-store" });
    if (userResponse.ok) {
      const providerUser = await userResponse.json() as { userId?: string };
      providerUserId = providerUser.userId || null;
    }

    const now = Date.now();
    const { error } = await supabase.from("athlete_provider_connections").upsert({
      user_id: user.id, provider: "garmin", status: "connected", provider_user_id: providerUserId,
      access_token_ciphertext: encryptGarminToken(tokens.access_token, user.id),
      refresh_token_ciphertext: tokens.refresh_token ? encryptGarminToken(tokens.refresh_token, user.id) : null,
      token_expires_at: new Date(now + Math.max(tokens.expires_in - 600, 60) * 1000).toISOString(),
      refresh_token_expires_at: tokens.refresh_token_expires_in ? new Date(now + tokens.refresh_token_expires_in * 1000).toISOString() : null,
      scopes: tokens.scope || null, connected_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    });
    if (error) throw error;
    return profileRedirect(request, "connected");
  } catch (error) {
    console.error("Garmin OAuth callback failed", error instanceof Error ? error.message : error);
    return profileRedirect(request, "connection-error");
  }
}
