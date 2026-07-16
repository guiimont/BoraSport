import "server-only";

import { cookies } from "next/headers";

import { createClient } from "./supabase-server";

const inviteTokenCookie = "bora_invite_token";
const inviteNameCookie = "bora_invite_name";
const maxTokenLength = 256;
const maxCookieAgeSeconds = 60 * 60 * 24 * 14;

export type InviteContext = {
  companyName?: string;
  companySlug?: string;
  error?: string;
  expiresAt?: string;
  status: "active" | "expired" | "invalid" | "revoked" | "used";
};

export type InviteConsumptionResult = {
  error?: string;
  redirectTo?: string;
  success?: string;
};

function isProduction() {
  return process.env.NODE_ENV === "production";
}

function getCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    maxAge,
    path: "/",
    sameSite: "lax" as const,
    secure: isProduction(),
  };
}

export function cleanInviteToken(value: string) {
  const token = value.trim();

  if (
    !token ||
    token.length > maxTokenLength ||
    !/^[A-Za-z0-9_-]+$/.test(token)
  ) {
    return "";
  }

  return token;
}

export async function clearInviteCookies() {
  const cookieStore = await cookies();

  cookieStore.delete(inviteTokenCookie);
  cookieStore.delete(inviteNameCookie);
}

export async function readInviteTokenCookie() {
  const cookieStore = await cookies();

  return cleanInviteToken(cookieStore.get(inviteTokenCookie)?.value || "");
}

export async function readInviteNameCookie() {
  const cookieStore = await cookies();

  return cookieStore.get(inviteNameCookie)?.value?.trim() || "";
}

export async function writeInviteTokenCookie(token: string, maxAge: number) {
  const cookieStore = await cookies();

  cookieStore.set(inviteTokenCookie, token, getCookieOptions(maxAge));
}

export async function writeInviteNameCookie(name: string, maxAge: number) {
  const cookieStore = await cookies();

  cookieStore.set(inviteNameCookie, name, getCookieOptions(maxAge));
}

export function getInviteCookieMaxAge(expiresAt: string) {
  const expirationTime = new Date(expiresAt).getTime();
  const secondsUntilExpiration = Math.floor((expirationTime - Date.now()) / 1000);

  return Math.max(0, Math.min(secondsUntilExpiration, maxCookieAgeSeconds));
}

export function getInviteNameCookieMaxAge(expiresAt?: string) {
  if (!expiresAt) {
    return 60;
  }

  return Math.max(60, getInviteCookieMaxAge(expiresAt));
}

export function mapInviteError(message: string) {
  if (message.includes("invite_expired")) {
    return "Este convite expirou. Peça um novo convite ao clube.";
  }

  if (message.includes("invite_revoked")) {
    return "Este convite foi revogado pelo clube.";
  }

  if (message.includes("invite_used")) {
    return "Este convite já foi utilizado.";
  }

  if (message.includes("authentication_required")) {
    return "Entre com sua conta para concluir o convite.";
  }

  return "Não foi possível concluir o convite. Reabra o link recebido pelo clube e tente novamente.";
}

export async function getInviteContextFromToken(
  token: string,
): Promise<InviteContext> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    "get_company_invite_public_context",
    { p_token: token },
  );

  if (error) {
    return {
      error: "Não foi possível validar o convite neste momento.",
      status: "invalid",
    };
  }

  const context = Array.isArray(data) ? data[0] : data;

  return {
    companyName: context?.company_name || undefined,
    companySlug: context?.company_slug || undefined,
    expiresAt: context?.expires_at || undefined,
    status: context?.status || "invalid",
  };
}

export async function consumeStoredInvite(): Promise<InviteConsumptionResult> {
  const token = await readInviteTokenCookie();
  const storedName = await readInviteNameCookie();

  if (!token) {
    return {
      error: "Reabra o convite original enviado pelo clube para concluir.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: "Entre com sua conta para concluir o convite.",
    };
  }

  const fallbackName =
    storedName ||
    (typeof user.user_metadata?.name === "string"
      ? user.user_metadata.name
      : "") ||
    user.email ||
    "Remador BoraSport";

  const { data, error } = await supabase.rpc("consume_company_invite", {
    p_name: fallbackName,
    p_token: token,
  });

  if (error) {
    const message = mapInviteError(error.message);

    if (
      message.includes("expirou") ||
      message.includes("revogado") ||
      message.includes("utilizado") ||
      message.includes("Reabra")
    ) {
      await clearInviteCookies();
    }

    return { error: message };
  }

  await clearInviteCookies();

  const result = Array.isArray(data) ? data[0] : data;
  const companySlug = result?.company_slug;

  return {
    redirectTo: companySlug ? `/clube/${companySlug}` : "/perfil",
    success: "Convite aceito. Seu acesso ao clube foi ativado.",
  };
}

export async function consumeStoredInviteIfPresent() {
  const token = await readInviteTokenCookie();

  if (!token) {
    return null;
  }

  return consumeStoredInvite();
}
