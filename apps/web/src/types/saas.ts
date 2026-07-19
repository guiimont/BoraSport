export type JsonObject = Record<string, string | number | boolean | null>;

export type VocabularyConfig = {
  booking_label?: string;
  professional_label?: string;
  resource_label?: string;
  service_label?: string;
};

export type ThemeColors = {
  accent?: string;
  background?: string;
  primary?: string;
  secondary?: string;
};

export type Company = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  theme_colors: ThemeColors;
  vocabulary_config: VocabularyConfig;
  type_de_negocio: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type Resource = {
  id: string;
  company_id: string;
  name: string;
  capacity_maxima: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Service = {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type CompanySlot = {
  id: string;
  company_id: string;
  service_id: string;
  resource_id: string | null;
  professional_id: string | null;
  start_time: string;
  end_time: string;
  spots_total: number;
  spots_occupied: number;
  spots_available?: number;
  services: Pick<
    Service,
    "description" | "duration_minutes" | "id" | "name" | "price"
  > | null;
  resources: Pick<Resource, "capacity_maxima" | "id" | "name"> | null;
};

export type WeeklyWorkout = {
  id: string;
  company_id: string;
  week_start_date: string;
  weekday: number;
  title: string;
  description: string | null;
  attachment_url: string | null;
  attachment_name: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type LandingPage = {
  id: string;
  company_id: string;
  slug: string;
  template_key: string;
  title: string;
  subtitle: string | null;
  hero_image_url: string | null;
  cta_label: string;
  cta_href: string | null;
  sections: JsonObject[];
  is_published: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type SlotParticipant = {
  avatar_url: string | null;
  company_id: string;
  name: string;
  public_profile_id: string;
  slot_id: string;
};

export type PublicSportProfile = {
  avatar_url: string | null;
  name: string;
  public_id: string;
};

export type BookingStatus = "confirmed" | "cancelled" | "attended" | "missed";
export type MembershipRole = "admin" | "client" | "professional";

export type Membership = {
  id: string;
  user_id: string;
  company_id: string;
  role: MembershipRole;
  created_at: string;
  updated_at: string;
};

export type MembershipWithCompany = Membership & {
  companies: Pick<Company, "id" | "logo_url" | "name" | "slug"> | null;
};

export type CompanyMember = Membership & {
  profile: Pick<Profile, "avatar_url" | "id" | "name"> | null;
};

export type CompanyInvitationStatus = "active" | "expired" | "revoked" | "used";

export type CompanyInvitation = {
  accepted_email: string | null;
  company_id: string;
  created_at: string;
  created_by: string;
  expires_at: string;
  id: string;
  revoked_at: string | null;
  role: MembershipRole;
  updated_at: string;
  used_at: string | null;
  used_by: string | null;
};

export type Profile = {
  avatar_url: string | null;
  created_at: string;
  id: string;
  name: string;
  phone: string | null;
  updated_at: string;
};

export type Booking = {
  id: string;
  slot_id: string;
  user_id: string;
  company_id: string;
  status: BookingStatus;
  created_at: string;
  updated_at: string;
};

export type NewBooking = Pick<Booking, "company_id" | "slot_id" | "user_id"> & {
  status?: BookingStatus;
};
