import { createClient } from "../../../utils/supabase/server";
import type { NewReservation, Reservation } from "../../types/saas";

export async function createReservation(
  data: NewReservation,
): Promise<Reservation> {
  const supabase = createClient();

  const { data: reservation, error } = await supabase
    .from("reservations")
    .insert({
      club_id: data.club_id,
      slot_id: data.slot_id,
      customer_name: data.customer_name,
      customer_phone: data.customer_phone,
      customer_email: data.customer_email,
      status: data.status ?? "pending",
    })
    .select(
      "id,club_id,slot_id,customer_name,customer_phone,customer_email,status,created_at",
    )
    .single();

  if (error) {
    throw new Error(`Failed to create reservation: ${error.message}`);
  }

  return reservation as Reservation;
}
