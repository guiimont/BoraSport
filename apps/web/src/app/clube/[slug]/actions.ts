"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  cancelOwnSlotBooking,
  ensureProfile,
  reserveAvailableSlot,
} from "../../../lib/saas/mutations";
import { createClient } from "../../../lib/saas/supabase-server";

export type ReservationActionState = {
  error?: string;
  success?: string;
};

export async function reserveSlot(
  _previousState: ReservationActionState,
  formData: FormData,
): Promise<ReservationActionState> {
  const companyId = String(formData.get("company_id") || "");
  const slotId = String(formData.get("slot_id") || "");
  const slug = String(formData.get("slug") || "");

  if (!companyId || !slotId) {
    return { error: "Não foi possível identificar esse horário." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(slug ? `/clube/${slug}` : "/perfil")}`);
  }

  try {
    await ensureProfile({
      avatarUrl: (user.user_metadata?.avatar_url as string | undefined) || null,
      email: user.email,
      name:
        (user.user_metadata?.name as string | undefined) ||
        (user.user_metadata?.full_name as string | undefined) ||
        "",
      userId: user.id,
    });

    await reserveAvailableSlot({ companyId, slotId });
  } catch {
    return {
      error:
        "Não foi possível concluir a reserva. Atualize a agenda e tente novamente.",
    };
  }

  revalidatePath(slug ? `/clube/${slug}` : "/clube/[slug]");
  return { success: "Māuruuru! Seu assento na canoa está confirmado." };
}

export async function cancelSlotReservation(
  _previousState: ReservationActionState,
  formData: FormData,
): Promise<ReservationActionState> {
  const companyId = String(formData.get("company_id") || "");
  const slotId = String(formData.get("slot_id") || "");
  const slug = String(formData.get("slug") || "");

  if (!companyId || !slotId) {
    return { error: "Não foi possível identificar essa reserva." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(slug ? `/clube/${slug}` : "/perfil")}`);
  }

  try {
    await cancelOwnSlotBooking({ companyId, slotId });
  } catch {
    return {
      error:
        "Não foi possível cancelar agora. Atualize a agenda e tente novamente.",
    };
  }

  revalidatePath(slug ? `/clube/${slug}` : "/clube/[slug]");
  return {};
}
