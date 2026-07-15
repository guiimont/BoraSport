"use server";

import { headers } from "next/headers";

import { buildAuthCallbackUrl, sanitizeInternalPath } from "../../lib/saas/auth-redirect";
import { createClient } from "../../lib/saas/supabase-server";

export type LoginState = {
  error?: string;
  success?: string;
};

function readText(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

export async function sendMagicLink(
  _previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = readText(formData, "email");
  const next = sanitizeInternalPath(readText(formData, "next"), "/");

  if (!email) {
    return { error: "Informe seu email." };
  }

  const headerStore = await headers();
  const emailRedirectTo = buildAuthCallbackUrl(headerStore, next);
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo,
    },
  });

  if (error) {
    return { error: error.message };
  }

  return {
    success: "Enviamos um link de acesso para seu email.",
  };
}
