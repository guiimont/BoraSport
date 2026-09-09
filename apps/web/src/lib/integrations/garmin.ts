import "server-only";

export type GarminIntegrationStatus =
  | "awaiting_approval"
  | "configuration_required"
  | "ready";

const requiredServerVariables = [
  "GARMIN_CLIENT_ID",
  "GARMIN_CLIENT_SECRET",
  "GARMIN_OAUTH_AUTHORIZE_URL",
  "GARMIN_OAUTH_TOKEN_URL",
  "GARMIN_WEBHOOK_SECRET",
] as const;

export function getGarminIntegrationStatus(): GarminIntegrationStatus {
  if (process.env.GARMIN_INTEGRATION_ENABLED !== "true") {
    return "awaiting_approval";
  }

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
