"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "../../lib/saas/queries";
import { updateProfile } from "../../lib/saas/mutations";

export type ProfileState = {
  error?: string;
  success?: string;
};

function readText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readFile(formData: FormData, key: string) {
  const value = formData.get(key);
  if (!(value instanceof File) || value.size === 0) {
    return null;
  }

  return value;
}

function getReadableProfileError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  if (/bucket not found/i.test(message)) {
    return "Nao foi possivel enviar a foto porque o bucket profile-avatars ainda nao existe no Supabase. Rode a migration supabase/migrations/20260703160000_profile_avatars_storage.sql no SQL Editor e tente novamente.";
  }

  if (/row-level security|policy|permission/i.test(message)) {
    return "Nao foi possivel salvar por uma regra de seguranca do Supabase. Confirme se voce esta logado e se as policies de profiles/storage foram aplicadas.";
  }

  return `Nao foi possivel salvar. ${message}`;
}

export async function saveProfile(
  _state: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const user = await getCurrentUser();

  if (!user) {
    return { error: "Entre na sua conta antes de salvar o perfil." };
  }

  const name = readText(formData, "name");
  const phone = readText(formData, "phone");
  const avatarUrl = readText(formData, "avatarUrl");
  const avatarFile = readFile(formData, "avatarFile");

  if (!name) {
    return { error: "Informe seu nome para salvar o perfil." };
  }

  try {
    await updateProfile({
      avatarFile,
      avatarUrl: avatarUrl || null,
      name,
      phone: phone || null,
      userId: user.id,
    });

    revalidatePath("/perfil");
    revalidatePath("/clube/[slug]", "page");

    return { success: "Perfil salvo. Sua foto ja pode aparecer nas reservas." };
  } catch (error) {
    return { error: getReadableProfileError(error) };
  }
}
