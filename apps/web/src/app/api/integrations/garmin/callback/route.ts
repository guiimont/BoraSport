import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const destination = new URL("/perfil", url.origin);

  if (url.searchParams.get("error")) {
    destination.searchParams.set("garmin", "denied");
  } else if (url.searchParams.get("code")) {
    destination.searchParams.set("garmin", "authorization-received");
  } else {
    destination.searchParams.set("garmin", "callback-ready");
  }

  return NextResponse.redirect(destination);
}
