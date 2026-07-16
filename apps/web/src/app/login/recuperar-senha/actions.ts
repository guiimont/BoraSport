"use server";

import { headers } from "next/headers";

import { buildAuthCallbackUrl } from "../../../lib/saas/auth-redirect";
import { createClient } from "../../../lib/saas/supabase-server";

export type PasswordRecoveryState = {
  error?: string;
  success?: string;
};

function readText(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

export async function requestPasswordRecovery(
  _previousState: PasswordRecoveryState,
  formData: FormData,
): Promise<PasswordRecoveryState> {
  const email = readText(formData, "email").toLowerCase();

  if (!email) {
    return { error: "Informe seu e-mail." };
  }

  const headerStore = await headers();
  const redirectTo = buildAuthCallbackUrl(headerStore, "/auth/reset");
  const supabase = await createClient();

  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  return {
    success:
      "Se este e-mail estiver cadastrado, enviaremos um link para redefinir sua senha.",
  };
}
