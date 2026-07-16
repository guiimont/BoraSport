"use server";

import { cookies, headers } from "next/headers";

import { buildAuthCallbackUrl } from "../../lib/saas/auth-redirect";
import { createClient } from "../../lib/saas/supabase-server";

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

export type InviteFormState = {
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

function cleanToken(value: string) {
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

function readText(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

async function clearInviteCookies() {
  const cookieStore = await cookies();

  cookieStore.delete(inviteTokenCookie);
  cookieStore.delete(inviteNameCookie);
}

async function readInviteTokenCookie() {
  const cookieStore = await cookies();

  return cleanToken(cookieStore.get(inviteTokenCookie)?.value || "");
}

async function readInviteNameCookie() {
  const cookieStore = await cookies();

  return cookieStore.get(inviteNameCookie)?.value?.trim() || "";
}

function mapInviteError(message: string) {
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

async function getInviteContextFromToken(token: string): Promise<InviteContext> {
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

export async function storeInviteToken(tokenValue: string): Promise<InviteContext> {
  const token = cleanToken(tokenValue);

  if (!token) {
    await clearInviteCookies();

    return {
      error: "Convite inválido. Reabra o link enviado pelo clube.",
      status: "invalid",
    };
  }

  const context = await getInviteContextFromToken(token);

  if (context.status !== "active" || !context.expiresAt) {
    await clearInviteCookies();

    return context;
  }

  const expiresAt = new Date(context.expiresAt).getTime();
  const secondsUntilExpiration = Math.floor((expiresAt - Date.now()) / 1000);
  const maxAge = Math.max(
    0,
    Math.min(secondsUntilExpiration, maxCookieAgeSeconds),
  );

  if (maxAge <= 0) {
    await clearInviteCookies();

    return {
      ...context,
      status: "expired",
    };
  }

  const cookieStore = await cookies();
  cookieStore.set(inviteTokenCookie, token, getCookieOptions(maxAge));

  return context;
}

export async function getStoredInviteContext(): Promise<InviteContext> {
  const token = await readInviteTokenCookie();

  if (!token) {
    return {
      error: "Abra o convite original enviado pelo clube para continuar.",
      status: "invalid",
    };
  }

  const context = await getInviteContextFromToken(token);

  if (context.status !== "active") {
    await clearInviteCookies();
  }

  return context;
}

export async function signUpWithInvite(
  _previousState: InviteFormState,
  formData: FormData,
): Promise<InviteFormState> {
  const token = await readInviteTokenCookie();
  const name = readText(formData, "name");
  const email = readText(formData, "email").toLowerCase();
  const password = readText(formData, "password");
  const passwordConfirmation = readText(formData, "passwordConfirmation");

  if (!token) {
    return {
      error: "Reabra o convite original enviado pelo clube antes de criar a conta.",
    };
  }

  if (!name || !email || !password || !passwordConfirmation) {
    return { error: "Preencha nome, e-mail, senha e confirmação." };
  }

  if (password.length < 8) {
    return { error: "Use uma senha com pelo menos 8 caracteres." };
  }

  if (password !== passwordConfirmation) {
    return { error: "A confirmação da senha não confere." };
  }

  const context = await getInviteContextFromToken(token);

  if (context.status !== "active") {
    await clearInviteCookies();

    return {
      error: context.error || "Este convite não está mais disponível.",
    };
  }

  const cookieStore = await cookies();
  const expiresAt = context.expiresAt ? new Date(context.expiresAt).getTime() : 0;
  const maxAge = Math.max(
    60,
    Math.min(Math.floor((expiresAt - Date.now()) / 1000), maxCookieAgeSeconds),
  );
  cookieStore.set(inviteNameCookie, name, getCookieOptions(maxAge));

  const headerStore = await headers();
  const emailRedirectTo = buildAuthCallbackUrl(headerStore, "/convite");
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name },
      emailRedirectTo,
    },
  });

  if (error) {
    return {
      error:
        "Não foi possível criar a conta. Se você já tem conta, entre com e-mail e senha para aceitar o convite.",
    };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    return acceptStoredInvite();
  }

  return {
    success:
      "Enviamos um e-mail de confirmação. Abra o link no mesmo navegador para concluir o vínculo com o clube.",
  };
}

export async function acceptStoredInvite(): Promise<InviteFormState> {
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
