"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  cancelOwnSlotBooking,
  ensureProfile,
  reserveAvailableSlot,
} from "../../../lib/saas/mutations";
import { createClient } from "../../../lib/saas/supabase-server";

export async function reserveSlot(formData: FormData) {
  const companyId = String(formData.get("company_id") || "");
  const slotId = String(formData.get("slot_id") || "");
  const slug = String(formData.get("slug") || "");

  if (!companyId || !slotId) {
    return;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(slug ? `/clube/${slug}` : "/perfil")}`);
  }

  await ensureProfile({
    avatarUrl: (user.user_metadata?.avatar_url as string | undefined) || null,
    email: user.email,
    name:
      (user.user_metadata?.name as string | undefined) ||
      (user.user_metadata?.full_name as string | undefined) ||
      "",
    userId: user.id,
  });

  await reserveAvailableSlot({
    companyId,
    slotId,
  });

  revalidatePath(slug ? `/clube/${slug}` : "/clube/[slug]");
}

export async function cancelSlotReservation(formData: FormData) {
  const companyId = String(formData.get("company_id") || "");
  const slotId = String(formData.get("slot_id") || "");
  const slug = String(formData.get("slug") || "");

  if (!companyId || !slotId) {
    return;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(slug ? `/clube/${slug}` : "/perfil")}`);
  }

  await cancelOwnSlotBooking({ companyId, slotId });

  revalidatePath(slug ? `/clube/${slug}` : "/clube/[slug]");
}
