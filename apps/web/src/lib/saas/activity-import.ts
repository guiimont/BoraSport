import { createHash } from "node:crypto";

import { Decoder, Stream } from "@garmin/fitsdk";
import { XMLParser } from "fast-xml-parser";

type ImportedActivity = {
  activityType: string;
  averageHeartRate: number | null;
  averageSpeed: number | null;
  calories: number | null;
  distanceMeters: number | null;
  durationSeconds: number | null;
  elevationGainMeters: number | null;
  externalId: string;
  maxHeartRate: number | null;
  maxSpeed: number | null;
  provider: "file_fit" | "file_gpx" | "file_tcx";
  sourcePayload: Record<string, string | number | boolean | null>;
  startedAt: string;
  title: string;
};

const MAX_ACTIVITY_FILE_BYTES = 15 * 1024 * 1024;

function asArray<T>(value: T | T[] | undefined | null): T[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function finiteNumber(value: unknown): number | null {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

function isoDate(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }

  if (typeof value !== "string" && typeof value !== "number") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function secondsBetween(first: string | null, last: string | null) {
  if (!first || !last) return null;
  const seconds = Math.round((Date.parse(last) - Date.parse(first)) / 1000);
  return seconds > 0 ? seconds : null;
}

function hashFile(bytes: Uint8Array) {
  return createHash("sha256").update(bytes).digest("hex");
}

function validateFile(file: File) {
  if (!file.size) throw new Error("O arquivo está vazio.");
  if (file.size > MAX_ACTIVITY_FILE_BYTES) {
    throw new Error("O arquivo deve ter no máximo 15 MB.");
  }

  const extension = file.name.split(".").pop()?.toLowerCase();
  if (!extension || !["fit", "gpx", "tcx"].includes(extension)) {
    throw new Error("Envie um arquivo FIT, GPX ou TCX.");
  }

  return extension as "fit" | "gpx" | "tcx";
}

function parseFit(bytes: Uint8Array, fileName: string, externalId: string): ImportedActivity {
  const stream = Stream.fromByteArray(Array.from(bytes));
  const decoder = new Decoder(stream);

  if (!decoder.isFIT() || !decoder.checkIntegrity()) {
    throw new Error("O arquivo FIT está inválido ou corrompido.");
  }

  const result = decoder.read({ convertDateTimesToDates: true });
  if (result.errors.length) {
    throw new Error("Não foi possível interpretar todos os dados do arquivo FIT.");
  }

  const messages = result.messages as Record<string, unknown>;
  const sessions = asArray(
    (messages.sessionMesgs ?? messages.sessions) as Record<string, unknown> | Record<string, unknown>[] | undefined,
  );
  const session = sessions[0];

  if (!session) throw new Error("O FIT não contém uma sessão de atividade.");

  const startedAt = isoDate(session.startTime ?? session.timestamp);
  if (!startedAt) throw new Error("O FIT não informa quando a atividade começou.");

  return {
    activityType: String(session.sport ?? session.subSport ?? "paddling"),
    averageHeartRate: finiteNumber(session.avgHeartRate),
    averageSpeed: finiteNumber(session.avgSpeed),
    calories: finiteNumber(session.totalCalories),
    distanceMeters: finiteNumber(session.totalDistance),
    durationSeconds: finiteNumber(session.totalTimerTime ?? session.totalElapsedTime),
    elevationGainMeters: finiteNumber(session.totalAscent),
    externalId,
    maxHeartRate: finiteNumber(session.maxHeartRate),
    maxSpeed: finiteNumber(session.maxSpeed),
    provider: "file_fit",
    sourcePayload: { file_name: fileName, format: "fit", parsed: true },
    startedAt,
    title: "Remada importada",
  };
}

function parseGpx(xml: string, fileName: string, externalId: string): ImportedActivity {
  const parser = new XMLParser({ ignoreAttributes: false, parseTagValue: true });
  const document = parser.parse(xml) as Record<string, unknown>;
  const gpx = document.gpx as Record<string, unknown> | undefined;
  const tracks = asArray(gpx?.trk as Record<string, unknown> | Record<string, unknown>[] | undefined);
  const segments = tracks.flatMap((track) =>
    asArray(track.trkseg as Record<string, unknown> | Record<string, unknown>[] | undefined),
  );
  const points = segments.flatMap((segment) =>
    asArray(segment.trkpt as Record<string, unknown> | Record<string, unknown>[] | undefined),
  );
  const times = points.map((point) => isoDate(point.time)).filter((value): value is string => Boolean(value));

  if (!times.length) throw new Error("O GPX não contém pontos com data e hora.");

  let distanceMeters = 0;
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const lat1 = finiteNumber(previous["@_lat"]);
    const lon1 = finiteNumber(previous["@_lon"]);
    const lat2 = finiteNumber(current["@_lat"]);
    const lon2 = finiteNumber(current["@_lon"]);
    if ([lat1, lon1, lat2, lon2].some((value) => value === null)) continue;

    const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
    const deltaLat = toRadians(lat2! - lat1!);
    const deltaLon = toRadians(lon2! - lon1!);
    const a =
      Math.sin(deltaLat / 2) ** 2 +
      Math.cos(toRadians(lat1!)) * Math.cos(toRadians(lat2!)) *
        Math.sin(deltaLon / 2) ** 2;
    distanceMeters += 6_371_000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  const trackName = typeof tracks[0]?.name === "string" ? tracks[0].name : "Remada importada";
  return {
    activityType: "paddling",
    averageHeartRate: null,
    averageSpeed: null,
    calories: null,
    distanceMeters: distanceMeters > 0 ? Math.round(distanceMeters * 100) / 100 : null,
    durationSeconds: secondsBetween(times[0], times[times.length - 1]),
    elevationGainMeters: null,
    externalId,
    maxHeartRate: null,
    maxSpeed: null,
    provider: "file_gpx",
    sourcePayload: { file_name: fileName, format: "gpx", parsed: true, track_points: points.length },
    startedAt: times[0],
    title: trackName,
  };
}

function parseTcx(xml: string, fileName: string, externalId: string): ImportedActivity {
  const parser = new XMLParser({ ignoreAttributes: false, parseTagValue: true });
  const document = parser.parse(xml) as Record<string, unknown>;
  const database = document.TrainingCenterDatabase as Record<string, unknown> | undefined;
  const activities = database?.Activities as Record<string, unknown> | undefined;
  const activity = asArray(
    activities?.Activity as Record<string, unknown> | Record<string, unknown>[] | undefined,
  )[0];
  const laps = asArray(activity?.Lap as Record<string, unknown> | Record<string, unknown>[] | undefined);

  if (!activity || !laps.length) throw new Error("O TCX não contém uma atividade válida.");

  const startedAt = isoDate(activity.Id ?? laps[0]?.["@_StartTime"]);
  if (!startedAt) throw new Error("O TCX não informa quando a atividade começou.");

  const sum = (key: string) => {
    const values = laps.map((lap) => finiteNumber(lap[key])).filter((value): value is number => value !== null);
    return values.length ? values.reduce((total, value) => total + value, 0) : null;
  };

  return {
    activityType: String(activity["@_Sport"] ?? "paddling"),
    averageHeartRate: null,
    averageSpeed: null,
    calories: sum("Calories"),
    distanceMeters: sum("DistanceMeters"),
    durationSeconds: sum("TotalTimeSeconds"),
    elevationGainMeters: null,
    externalId,
    maxHeartRate: null,
    maxSpeed: null,
    provider: "file_tcx",
    sourcePayload: { file_name: fileName, format: "tcx", parsed: true, laps: laps.length },
    startedAt,
    title: "Remada importada",
  };
}

export async function importActivityFile(file: File): Promise<ImportedActivity> {
  const extension = validateFile(file);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const externalId = hashFile(bytes);

  if (extension === "fit") return parseFit(bytes, file.name, externalId);

  const xml = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  return extension === "gpx"
    ? parseGpx(xml, file.name, externalId)
    : parseTcx(xml, file.name, externalId);
}
