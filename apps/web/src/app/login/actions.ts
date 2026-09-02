"use server";

import { sanitizeInternalPath } from "../../lib/saas/auth-redirect";
import { consumeStoredInviteIfPresent } from "../../lib/saas/invite-session";
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
  const next = sanitizeInternalPath(readText(formData, "next"), "/comunidade");

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

  const inviteResult = await consumeStoredInviteIfPresent();

  if (inviteResult?.redirectTo) {
    return {
      redirectTo: inviteResult.redirectTo,
      success: inviteResult.success || "Acesso confirmado.",
    };
  }

  return {
    redirectTo: next,
    success: "Acesso confirmado.",
  };
}
