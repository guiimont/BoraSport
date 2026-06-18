import { createClient } from "../../../utils/supabase/server";
import type { Club, Reservation, Slot } from "../../types/saas";

export async function getClubBySlug(slug: string): Promise<Club | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("clubs")
    .select("id,name,slug,logo_url,primary_color,created_at")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch club by slug: ${error.message}`);
  }

  return data as Club | null;
}

export async function getActiveSlotsByClubSlug(slug: string): Promise<Slot[]> {
  const club = await getClubBySlug(slug);

  if (!club) {
    return [];
  }

  const supabase = createClient();

  const { data, error } = await supabase
    .from("slots")
    .select("id,club_id,title,starts_at,ends_at,capacity,is_active,created_at")
    .eq("club_id", club.id)
    .eq("is_active", true)
    .gte("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch active slots: ${error.message}`);
  }

  return (data ?? []) as Slot[];
}

export async function getReservationsBySlot(
  slotId: string,
): Promise<Reservation[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("reservations")
    .select(
      "id,club_id,slot_id,customer_name,customer_phone,customer_email,status,created_at",
    )
    .eq("slot_id", slotId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch reservations by slot: ${error.message}`);
  }

  return (data ?? []) as Reservation[];
}
