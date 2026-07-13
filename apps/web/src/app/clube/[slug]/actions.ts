"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createBooking, ensureProfile } from "../../../lib/saas/mutations";
import { createClient } from "../../../lib/saas/supabase-server";

export async function reserveSlot(formData: FormData) {
  const companyId = String(formData.get("company_id") || "");
  const slotId = String(formData.get("slot_id") || "");

  if (!companyId || !slotId) {
    return;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/");
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

  await createBooking({
    company_id: companyId,
    slot_id: slotId,
    user_id: user.id,
    status: "confirmed",
  });

  revalidatePath("/clube/[slug]", "page");
}
