"use server";

import { headers } from "next/headers";

import { buildAuthCallbackUrl, sanitizeInternalPath } from "../../lib/saas/auth-redirect";
import { createClient } from "../../lib/saas/supabase-server";

export type LoginState = {
  error?: string;
  redirectTo?: string;
  success?: string;
};

function readText(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

export async function signInWithPassword(
  _previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = readText(formData, "email");
  const password = readText(formData, "password");
  const next = sanitizeInternalPath(readText(formData, "next"), "/");

  if (!email || !password) {
    return { error: "Informe e-mail e senha." };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: "E-mail ou senha inválidos." };
  }

  return {
    redirectTo: next,
    success: "Acesso confirmado.",
  };
}

export async function getPasswordRecoveryRedirect(next = "/auth/reset") {
  const headerStore = await headers();

  return buildAuthCallbackUrl(headerStore, next);
}
