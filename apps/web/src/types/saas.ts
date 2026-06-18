export type Club = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string | null;
  created_at: string;
};

export type Slot = {
  id: string;
  club_id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  capacity: number;
  is_active: boolean;
  created_at: string;
};

export type ReservationStatus = "pending" | "confirmed" | "cancelled";

export type Reservation = {
  id: string;
  club_id: string;
  slot_id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  status: ReservationStatus;
  created_at: string;
};

export type NewClub = Omit<Club, "id" | "created_at">;

export type NewSlot = Omit<Slot, "id" | "created_at" | "is_active"> & {
  is_active?: boolean;
};

export type NewReservation = Omit<Reservation, "id" | "created_at" | "status"> & {
  status?: ReservationStatus;
};
