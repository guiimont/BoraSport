import "server-only";

export type GarminIntegrationStatus =
  | "awaiting_approval"
  | "configuration_required"
  | "ready";

const requiredServerVariables = [
  "GARMIN_CLIENT_ID",
  "GARMIN_CLIENT_SECRET",
  "GARMIN_REDIRECT_URI",
] as const;

export const GARMIN_AUTHORIZE_URL =
  process.env.GARMIN_OAUTH_AUTHORIZE_URL || "https://connect.garmin.com/oauth2Confirm";
export const GARMIN_TOKEN_URL =
  process.env.GARMIN_OAUTH_TOKEN_URL ||
  "https://connectapi.garmin.com/di-oauth2-service/oauth/token";

export function getGarminIntegrationStatus(): GarminIntegrationStatus {
  const configured = requiredServerVariables.every((name) =>
    Boolean(process.env[name]?.trim()),
  );

  return configured ? "ready" : "configuration_required";
}

export function assertGarminIntegrationReady() {
  const status = getGarminIntegrationStatus();

  if (status !== "ready") {
    throw new Error(`Garmin integration is not ready: ${status}`);
  }
}
