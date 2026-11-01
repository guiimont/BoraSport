import { NextResponse } from "next/server";
import { createClient } from "../../../../../lib/saas/supabase-server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login?next=/perfil", request.url), 303);
  const { error } = await supabase.from("athlete_provider_connections").delete().eq("user_id", user.id).eq("provider", "garmin");
  return NextResponse.redirect(new URL(`/perfil?garmin=${error ? "disconnect-error" : "disconnected"}`, request.url), 303);
}
