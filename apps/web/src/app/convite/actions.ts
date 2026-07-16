"use server";

import { headers } from "next/headers";

import { getRequestOrigin } from "../../lib/saas/auth-redirect";
import {
  cleanInviteToken,
  clearInviteCookies,
  consumeStoredInvite,
  getInviteContextFromToken,
  getInviteCookieMaxAge,
  getInviteNameCookieMaxAge,
  readInviteTokenCookie,
  writeInviteNameCookie,
  writeInviteTokenCookie,
  type InviteContext,
  type InviteConsumptionResult,
} from "../../lib/saas/invite-session";
import { createClient } from "../../lib/saas/supabase-server";

export type { InviteContext } from "../../lib/saas/invite-session";

export type InviteFormState = {
  error?: string;
  redirectTo?: string;
  success?: string;
};

function readText(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

export async function storeInviteToken(tokenValue: string): Promise<InviteContext> {
  const token = cleanInviteToken(tokenValue);

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

  const maxAge = getInviteCookieMaxAge(context.expiresAt);

  if (maxAge <= 0) {
    await clearInviteCookies();

    return {
      ...context,
      status: "expired",
    };
  }

  await writeInviteTokenCookie(token, maxAge);

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

  return getInviteContextFromToken(token);
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

  await writeInviteNameCookie(name, getInviteNameCookieMaxAge(context.expiresAt));

  const headerStore = await headers();
  const emailRedirectTo = new URL(
    "/auth/callback/convite",
    getRequestOrigin(headerStore),
  ).toString();
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
      "Enviamos um e-mail de confirmação. Abra o link neste navegador para concluir o vínculo com o clube automaticamente.",
  };
}

export async function acceptStoredInvite(): Promise<InviteFormState> {
  return consumeStoredInvite() as Promise<InviteConsumptionResult>;
}
