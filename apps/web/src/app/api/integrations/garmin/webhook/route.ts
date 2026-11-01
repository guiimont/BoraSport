import { timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

type GarminRecord = Record<string, unknown>;

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function collectRecords(payload: unknown): GarminRecord[] {
  if (Array.isArray(payload)) return payload.flatMap(collectRecords);
  if (!payload || typeof payload !== "object") return [];
  const record = payload as GarminRecord;
  const nested = Object.values(record).filter(Array.isArray).flatMap(collectRecords);
  const isActivity = Boolean(record.userId && (record.activityId || record.summaryId));
  return isActivity ? [record, ...nested] : nested;
}

async function resolveCallbackRecords(payload: unknown) {
  const direct = collectRecords(payload);
  const containers = Array.isArray(payload) ? payload : payload && typeof payload === "object" ? Object.values(payload as GarminRecord).flat() : [];
  const callbackRecords: GarminRecord[] = [];

  for (const candidate of containers) {
    if (!candidate || typeof candidate !== "object") continue;
    const callbackURL = (candidate as GarminRecord).callbackURL;
    if (typeof callbackURL !== "string") continue;
    const callback = new URL(callbackURL);
    if (callback.protocol !== "https:" || !callback.hostname.endsWith(".garmin.com")) continue;
    const response = await fetch(callback, { cache: "no-store", signal: AbortSignal.timeout(8_000) });
    if (response.ok) callbackRecords.push(...collectRecords(await response.json()));
  }

  return [...direct, ...callbackRecords];
}

export async function GET() {
  return NextResponse.json({ ok: true, service: "garmin-activity-webhook", version: 1 });
}

export async function POST(request: Request) {
  const configuredSecret = process.env.GARMIN_WEBHOOK_SECRET?.trim() || "";
  const providedSecret = new URL(request.url).searchParams.get("token") || "";
  if (!configuredSecret || !safeEqual(providedSecret, configuredSecret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const rawBody = await request.text();
    if (rawBody.length > 1_500_000) {
      return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    }
    const records = await resolveCallbackRecords(JSON.parse(rawBody));
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    let accepted = 0;
    for (const activity of records) {
      const { error } = await supabase.rpc("ingest_garmin_activity", {
        p_activity: activity,
        p_secret: configuredSecret,
      });
      if (error) throw error;
      accepted += 1;
    }

    return NextResponse.json({ accepted, ok: true });
  } catch (error) {
    console.error("Garmin activity webhook failed", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
