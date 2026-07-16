"use server";

import { createClient } from "../../../lib/saas/supabase-server";

export type ResetPasswordState = {
  error?: string;
  success?: string;
};

function readText(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

export async function updatePassword(
  _previousState: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const password = readText(formData, "password");
  const passwordConfirmation = readText(formData, "passwordConfirmation");

  if (!password || !passwordConfirmation) {
    return { error: "Informe e confirme a nova senha." };
  }

  if (password.length < 8) {
    return { error: "Use uma senha com pelo menos 8 caracteres." };
  }

  if (password !== passwordConfirmation) {
    return { error: "A confirmação da senha não confere." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error:
        "Sessão de redefinição expirada. Peça um novo link de recuperação.",
    };
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return {
      error:
        "Não foi possível redefinir a senha. Peça um novo link e tente novamente.",
    };
  }

  return {
    success: "Senha redefinida. Você já pode acessar o BoraSport.",
  };
}
