"use server";

import { createReservation } from "../../../lib/saas/mutations";

export type ReservationActionState = {
  message: string;
  status: "idle" | "success" | "error";
  slotId?: string;
};

const initialError = "Não foi possível solicitar a reserva. Tente novamente.";

function readRequiredString(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

export async function requestReservation(
  _previousState: ReservationActionState,
  formData: FormData,
): Promise<ReservationActionState> {
  const clubId = readRequiredString(formData, "club_id");
  const slotId = readRequiredString(formData, "slot_id");
  const customerName = readRequiredString(formData, "customer_name");
  const customerPhone = readRequiredString(formData, "customer_phone");
  const customerEmail = readRequiredString(formData, "customer_email");

  if (!clubId || !slotId || !customerName || !customerPhone) {
    return {
      message: "Informe nome e telefone para solicitar a reserva.",
      status: "error",
      slotId,
    };
  }

  try {
    await createReservation({
      club_id: clubId,
      slot_id: slotId,
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_email: customerEmail || null,
      status: "pending",
    });

    return {
      message: "Reserva solicitada com sucesso. O clube irá confirmar seu horário.",
      status: "success",
      slotId,
    };
  } catch {
    return {
      message: initialError,
      status: "error",
      slotId,
    };
  }
}
