const LOCAL_ORIGIN = "http://localhost:3000";

function firstHeaderValue(value: string | null) {
  return value?.split(",")[0]?.trim() || "";
}

function isLocalHost(host: string) {
  return (
    host.startsWith("localhost") ||
    host.startsWith("127.0.0.1") ||
    host.startsWith("[::1]")
  );
}

export function getRequestOrigin(headerStore: Headers) {
  const forwardedHost = firstHeaderValue(headerStore.get("x-forwarded-host"));
  const host = forwardedHost || firstHeaderValue(headerStore.get("host"));

  if (host) {
    const forwardedProto = firstHeaderValue(headerStore.get("x-forwarded-proto"));
    const protocol = forwardedProto || (isLocalHost(host) ? "http" : "https");

    return `${protocol}://${host}`;
  }

  const origin = firstHeaderValue(headerStore.get("origin"));

  if (origin) {
    try {
      const parsed = new URL(origin);

      if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        return parsed.origin;
      }
    } catch {
      return LOCAL_ORIGIN;
    }
  }

  return LOCAL_ORIGIN;
}

export function sanitizeInternalPath(value: string | null | undefined, fallback = "/") {
  const path = value?.trim();

  if (!path || !path.startsWith("/") || path.startsWith("//")) {
    return fallback;
  }

  try {
    const parsed = new URL(path, LOCAL_ORIGIN);

    if (parsed.origin !== LOCAL_ORIGIN) {
      return fallback;
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

export function buildAuthCallbackUrl(headerStore: Headers, next?: string | null) {
  const origin = getRequestOrigin(headerStore);
  const callbackUrl = new URL("/auth/callback", origin);
  const safeNext = sanitizeInternalPath(next, "/");

  callbackUrl.searchParams.set("next", safeNext);

  return callbackUrl.toString();
}
