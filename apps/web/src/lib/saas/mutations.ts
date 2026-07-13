import type {
  JsonObject,
  LandingPage,
  MembershipRole,
  NewBooking,
  WeeklyWorkout,
  VocabularyConfig,
} from "../../types/saas";
import { createClient } from "./supabase-server";

export async function createBooking(data: NewBooking) {
  const supabase = await createClient();

  const { data: booking, error } = await supabase
    .from("bookings")
    .insert(data)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return booking;
}

export type UpdateCompanyConfigurationInput = {
  companyId: string;
  typeDeNegocio: string;
  vocabularyConfig: Required<VocabularyConfig>;
};

export async function updateCompanyConfiguration({
  companyId,
  typeDeNegocio,
  vocabularyConfig,
}: UpdateCompanyConfigurationInput) {
  const supabase = await createClient();

  const { data: company, error } = await supabase
    .from("companies")
    .update({
      type_de_negocio: typeDeNegocio,
      vocabulary_config: vocabularyConfig,
      updated_at: new Date().toISOString(),
    })
    .eq("id", companyId)
    .select(
      "id, name, slug, logo_url, theme_colors, vocabulary_config, type_de_negocio, created_at, updated_at",
    )
    .single();

  if (error) {
    throw error;
  }

  return company;
}

export type CreateResourceInput = {
  capacityMaxima: number;
  companyId: string;
  name: string;
};

export async function createResource({
  capacityMaxima,
  companyId,
  name,
}: CreateResourceInput) {
  const supabase = await createClient();

  const { data: resource, error } = await supabase
    .from("resources")
    .insert({
      capacity_maxima: capacityMaxima,
      company_id: companyId,
      is_active: true,
      name,
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return resource;
}

export type CreateServiceInput = {
  companyId: string;
  description: string | null;
  durationMinutes: number;
  name: string;
  price: number;
};

export async function createService({
  companyId,
  description,
  durationMinutes,
  name,
  price,
}: CreateServiceInput) {
  const supabase = await createClient();

  const { data: service, error } = await supabase
    .from("services")
    .insert({
      company_id: companyId,
      description,
      duration_minutes: durationMinutes,
      is_active: true,
      name,
      price,
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return service;
}

export type CreateSlotInput = {
  companyId: string;
  endTime: string;
  resourceId: string | null;
  serviceId: string;
  spotsTotal: number;
  startTime: string;
};

export async function createSlot({
  companyId,
  endTime,
  resourceId,
  serviceId,
  spotsTotal,
  startTime,
}: CreateSlotInput) {
  const supabase = await createClient();

  const { data: slot, error } = await supabase
    .from("slots")
    .insert({
      company_id: companyId,
      end_time: endTime,
      professional_id: null,
      resource_id: resourceId,
      service_id: serviceId,
      spots_occupied: 0,
      spots_total: spotsTotal,
      start_time: startTime,
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return slot;
}

export async function createSlotsSkippingDuplicates(slots: CreateSlotInput[]) {
  if (slots.length === 0) {
    return [];
  }

  const supabase = await createClient();
  const companyId = slots[0].companyId;
  const startTimes = slots.map((slot) => slot.startTime);

  const { data: existing, error: existingError } = await supabase
    .from("slots")
    .select("service_id,resource_id,start_time")
    .eq("company_id", companyId)
    .in("start_time", startTimes);

  if (existingError) {
    throw existingError;
  }

  const existingKeys = new Set(
    (existing ?? []).map(
      (slot) =>
        `${slot.service_id}:${slot.resource_id ?? ""}:${new Date(
          slot.start_time,
        ).toISOString()}`,
    ),
  );
  const rows = slots
    .filter(
      (slot) =>
        !existingKeys.has(
          `${slot.serviceId}:${slot.resourceId ?? ""}:${slot.startTime}`,
        ),
    )
    .map((slot) => ({
      company_id: slot.companyId,
      end_time: slot.endTime,
      professional_id: null,
      resource_id: slot.resourceId,
      service_id: slot.serviceId,
      spots_occupied: 0,
      spots_total: slot.spotsTotal,
      start_time: slot.startTime,
    }));

  if (rows.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("slots")
    .insert(rows)
    .select("*");

  if (error) {
    throw error;
  }

  return data ?? [];
}

export type UpsertWeeklyWorkoutInput = {
  attachmentFile?: File | null;
  companyId: string;
  createdBy: string;
  description: string | null;
  title: string;
  weekStartDate: string;
  weekday: number;
};

export async function upsertWeeklyWorkout({
  attachmentFile,
  companyId,
  createdBy,
  description,
  title,
  weekStartDate,
  weekday,
}: UpsertWeeklyWorkoutInput): Promise<WeeklyWorkout> {
  const supabase = await createClient();
  let attachmentName: string | null = null;
  let attachmentUrl: string | null = null;

  if (attachmentFile && attachmentFile.size > 0) {
    const safeName = attachmentFile.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const filePath = `${companyId}/${weekStartDate}/${weekday}-${Date.now()}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from("weekly-workouts")
      .upload(filePath, attachmentFile, {
        contentType: attachmentFile.type || "application/octet-stream",
        upsert: true,
      });

    if (uploadError) {
      throw uploadError;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("weekly-workouts").getPublicUrl(filePath);

    attachmentName = attachmentFile.name;
    attachmentUrl = publicUrl;
  }

  const payload: Record<string, unknown> = {
    company_id: companyId,
    created_by: createdBy,
    description,
    title,
    updated_at: new Date().toISOString(),
    week_start_date: weekStartDate,
    weekday,
  };

  if (attachmentUrl) {
    payload.attachment_name = attachmentName;
    payload.attachment_url = attachmentUrl;
  }

  const { data, error } = await supabase
    .from("weekly_workouts")
    .upsert(payload, {
      onConflict: "company_id,week_start_date,weekday",
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as WeeklyWorkout;
}

export type UpsertLandingPageInput = {
  companyId: string;
  createdBy: string;
  ctaLabel: string;
  heroImageFile?: File | null;
  isPublished: boolean;
  sections: JsonObject[];
  slug: string;
  subtitle: string | null;
  templateKey: string;
  title: string;
};

export async function upsertLandingPage({
  companyId,
  createdBy,
  ctaLabel,
  heroImageFile,
  isPublished,
  sections,
  slug,
  subtitle,
  templateKey,
  title,
}: UpsertLandingPageInput): Promise<LandingPage> {
  const supabase = await createClient();
  let heroImageUrl: string | null = null;

  if (heroImageFile && heroImageFile.size > 0) {
    const safeName = heroImageFile.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const filePath = `${companyId}/hero-${Date.now()}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from("landing-assets")
      .upload(filePath, heroImageFile, {
        contentType: heroImageFile.type || "image/jpeg",
        upsert: true,
      });

    if (uploadError) {
      throw uploadError;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("landing-assets").getPublicUrl(filePath);

    heroImageUrl = publicUrl;
  }

  const payload: Record<string, unknown> = {
    company_id: companyId,
    created_by: createdBy,
    cta_href: `/clube/${slug}`,
    cta_label: ctaLabel,
    is_published: isPublished,
    sections,
    slug,
    subtitle,
    template_key: templateKey,
    title,
    updated_at: new Date().toISOString(),
  };

  if (heroImageUrl) {
    payload.hero_image_url = heroImageUrl;
  }

  const { data, error } = await supabase
    .from("landing_pages")
    .upsert(payload, { onConflict: "company_id" })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as LandingPage;
}

export type EnsureProfileInput = {
  avatarUrl?: string | null;
  email?: string | null;
  name: string;
  userId: string;
};

export async function ensureProfile({
  avatarUrl,
  email,
  name,
  userId,
}: EnsureProfileInput) {
  const supabase = await createClient();
  const profileName = name || email || "Usuario Bora";

  const { data: profile, error } = await supabase
    .from("profiles")
    .upsert(
      {
        avatar_url: avatarUrl ?? null,
        id: userId,
        name: profileName,
      },
      { onConflict: "id" },
    )
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return profile;
}

export type UpdateProfileInput = {
  avatarUrl: string | null;
  avatarFile?: File | null;
  name: string;
  phone: string | null;
  userId: string;
};

export async function updateProfile({
  avatarFile,
  avatarUrl,
  name,
  phone,
  userId,
}: UpdateProfileInput) {
  const supabase = await createClient();
  let finalAvatarUrl = avatarUrl;

  if (avatarFile && avatarFile.size > 0) {
    const extension = avatarFile.name.split(".").pop() || "jpg";
    const filePath = `${userId}/avatar-${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("profile-avatars")
      .upload(filePath, avatarFile, {
        contentType: avatarFile.type || "image/jpeg",
        upsert: true,
      });

    if (uploadError) {
      throw uploadError;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("profile-avatars").getPublicUrl(filePath);

    finalAvatarUrl = publicUrl;
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .upsert(
      {
        avatar_url: finalAvatarUrl,
        id: userId,
        name,
        phone,
      },
      { onConflict: "id" },
    )
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return profile;
}

export type CreateMembershipInput = {
  companyId: string;
  role: MembershipRole;
  userId: string;
};

export async function createMembership({
  companyId,
  role,
  userId,
}: CreateMembershipInput) {
  const supabase = await createClient();

  const { data: membership, error } = await supabase
    .from("memberships")
    .insert({
      company_id: companyId,
      role,
      user_id: userId,
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return membership;
}
