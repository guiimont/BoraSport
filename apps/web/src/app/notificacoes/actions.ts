"use server";

import { revalidatePath } from "next/cache";

import { markOwnNotificationsAsRead } from "../../lib/saas/mutations";
import { getCurrentUser } from "../../lib/saas/queries";

export async function markNotificationsRead() {
  const user = await getCurrentUser();

  if (!user) {
    return;
  }

  await markOwnNotificationsAsRead(user.id);
  revalidatePath("/notificacoes");
}
