import type {
  BaseScheduleStatus,
  BookingStatus,
  CompanyInvitation,
  DefaultSteererPolicy,
  JsonObject,
  LandingPage,
  MembershipRole,
  OperationalSessionStatus,
  TrainingBlockInput,
  TrainingMode,
  TrainingVersionLevel,
  VesselClass,
  VesselStatus,
  WeeklyWorkout,
  VocabularyConfig,
} from "../../types/saas";
import { createHash, randomBytes } from "node:crypto";
import { createClient } from "./supabase-server";

export async function reserveAvailableSlot({
  companyId,
  slotId,
}: {
  companyId: string;
  slotId: string;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("reserve_slot", {
    p_company_id: companyId,
    p_slot_id: slotId,
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function cancelOwnSlotBooking({
  companyId,
  slotId,
}: {
  companyId: string;
  slotId: string;
}) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_my_slot_booking", {
    p_company_id: companyId,
    p_slot_id: slotId,
  });

  if (error) {
    throw error;
  }
}

export async function setBookingAttendance({
  bookingId,
  companyId,
  sessionId,
  status,
}: {
  bookingId: string;
  companyId: string;
  sessionId: string;
  status: Extract<BookingStatus, "attended" | "missed">;
}) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_booking_attendance", {
    p_booking_id: bookingId,
    p_company_id: companyId,
    p_session_id: sessionId,
    p_status: status,
  });

  if (error) {
    throw error;
  }
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
  defaultSteererPolicy?: DefaultSteererPolicy | null;
  internalCode?: string | null;
  locationId?: string | null;
  name: string;
  operationalNotes?: string | null;
  vesselClass?: VesselClass | null;
  vesselStatus?: VesselStatus;
};

export async function createResource({
  capacityMaxima,
  companyId,
  defaultSteererPolicy = null,
  internalCode = null,
  locationId = null,
  name,
  operationalNotes = null,
  vesselClass = null,
  vesselStatus = "disponivel",
}: CreateResourceInput) {
  const supabase = await createClient();

  const { data: resource, error } = await supabase
    .from("resources")
    .insert({
      capacity_maxima: capacityMaxima,
      company_id: companyId,
      default_steerer_policy: defaultSteererPolicy,
      internal_code: internalCode,
      location_id: locationId,
      is_active: vesselStatus !== "inativa",
      name,
      operational_notes: operationalNotes,
      vessel_class: vesselClass,
      vessel_status: vesselStatus,
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return resource;
}

export type UpdateResourceInput = CreateResourceInput & {
  resourceId: string;
};

export async function updateResource({
  capacityMaxima,
  companyId,
  defaultSteererPolicy = null,
  internalCode = null,
  locationId = null,
  name,
  operationalNotes = null,
  resourceId,
  vesselClass = null,
  vesselStatus = "disponivel",
}: UpdateResourceInput) {
  const supabase = await createClient();

  const { data: resource, error } = await supabase
    .from("resources")
    .update({
      capacity_maxima: capacityMaxima,
      default_steerer_policy: defaultSteererPolicy,
      internal_code: internalCode,
      location_id: locationId,
      is_active: vesselStatus !== "inativa",
      name,
      operational_notes: operationalNotes,
      updated_at: new Date().toISOString(),
      vessel_class: vesselClass,
      vessel_status: vesselStatus,
    })
    .eq("company_id", companyId)
    .eq("id", resourceId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return resource;
}

export type UpdateResourceOperationalStatusInput = {
  companyId: string;
  resourceId: string;
  vesselStatus: VesselStatus;
};

export async function updateResourceOperationalStatus({
  companyId,
  resourceId,
  vesselStatus,
}: UpdateResourceOperationalStatusInput) {
  const supabase = await createClient();

  const { data: resource, error } = await supabase
    .from("resources")
    .update({
      is_active: vesselStatus !== "inativa",
      updated_at: new Date().toISOString(),
      vessel_status: vesselStatus,
    })
    .eq("company_id", companyId)
    .eq("id", resourceId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return resource;
}

export type UpsertBaseScheduleInput = {
  coachId: string;
  companyId: string;
  createdBy: string;
  durationMinutes: number;
  groupName: string;
  level?: string | null;
  locationId?: string | null;
  resourceIds: string[];
  scheduleId?: string | null;
  startTime: string;
  status: BaseScheduleStatus;
  weekday: number;
};

export async function upsertBaseSchedule({
  coachId,
  companyId,
  createdBy,
  durationMinutes,
  groupName,
  level = null,
  locationId = null,
  resourceIds,
  scheduleId = null,
  startTime,
  status,
  weekday,
}: UpsertBaseScheduleInput): Promise<string> {
  const supabase = await createClient();
  const uniqueResourceIds = [...new Set(resourceIds)];
  const { data, error } = await supabase.rpc("upsert_base_schedule", {
    p_coach_id: coachId,
    p_company_id: companyId,
    p_duration_minutes: durationMinutes,
    p_group_name: groupName,
    p_level: level,
    p_location_id: locationId,
    p_resource_ids: uniqueResourceIds,
    p_schedule_id: scheduleId,
    p_start_time: startTime,
    p_status: status,
    p_weekday: weekday,
  });

  if (error) {
    throw error;
  }

  void createdBy;

  return data as string;
}

export async function updateBaseScheduleStatus({
  companyId,
  scheduleId,
  status,
}: {
  companyId: string;
  scheduleId: string;
  status: BaseScheduleStatus;
}) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("base_schedules")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("company_id", companyId)
    .eq("id", scheduleId);

  if (error) {
    throw error;
  }
}

export type UpsertOperationalSessionInput = {
  baseScheduleId?: string | null;
  coachId: string;
  companyId: string;
  durationMinutes: number;
  groupName: string;
  level?: string | null;
  locationId?: string | null;
  resourceIds: string[];
  sessionDate: string;
  sessionId?: string | null;
  startTime: string;
  status: OperationalSessionStatus;
  trainingPlanVersionId?: string | null;
};

export async function upsertOperationalSession({
  baseScheduleId = null,
  coachId,
  companyId,
  durationMinutes,
  groupName,
  level = null,
  locationId = null,
  resourceIds,
  sessionDate,
  sessionId = null,
  startTime,
  status,
  trainingPlanVersionId = null,
}: UpsertOperationalSessionInput): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("upsert_operational_session", {
    p_base_schedule_id: baseScheduleId,
    p_coach_id: coachId,
    p_company_id: companyId,
    p_duration_minutes: durationMinutes,
    p_group_name: groupName,
    p_level: level,
    p_location_id: locationId,
    p_resource_ids: [...new Set(resourceIds)],
    p_session_date: sessionDate,
    p_session_id: sessionId,
    p_start_time: startTime,
    p_status: status,
    p_training_plan_version_id: trainingPlanVersionId,
  });

  if (error) {
    throw error;
  }

  return data as string;
}

export async function createCompanyLocation({
  address,
  companyId,
  name,
  publicNotes,
}: {
  address?: string | null;
  companyId: string;
  name: string;
  publicNotes?: string | null;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("company_locations")
    .insert({
      address,
      company_id: companyId,
      name,
      public_notes: publicNotes,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function updateCompanyLocation({
  address,
  companyId,
  isActive,
  locationId,
  name,
  publicNotes,
}: {
  address?: string | null;
  companyId: string;
  isActive: boolean;
  locationId: string;
  name: string;
  publicNotes?: string | null;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("company_locations")
    .update({
      address,
      is_active: isActive,
      name,
      public_notes: publicNotes,
      updated_at: new Date().toISOString(),
    })
    .eq("company_id", companyId)
    .eq("id", locationId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function setOperationalSessionTraining({
  sessionId,
  trainingPlanVersionId,
}: {
  sessionId: string;
  trainingPlanVersionId: string | null;
}) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_operational_session_training", {
    p_session_id: sessionId,
    p_training_plan_version_id: trainingPlanVersionId,
  });

  if (error) {
    throw error;
  }
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
  name,
  userId,
}: EnsureProfileInput) {
  const supabase = await createClient();
  const { data: existingProfile, error: existingProfileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (existingProfileError) {
    throw existingProfileError;
  }

  // Reservar um horário nunca deve alterar dados que o remador já salvou.
  if (existingProfile) {
    return existingProfile;
  }

  const metadataName = name.trim();
  const profileName =
    metadataName && !metadataName.includes("@")
      ? metadataName
      : "Remador BoraSport";

  const { data: profile, error } = await supabase
    .from("profiles")
    .insert({
      avatar_url: avatarUrl ?? null,
      id: userId,
      name: profileName,
    })
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
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user || user.id !== userId) {
    throw new Error("Sessão inválida. Entre novamente para salvar seu perfil.");
  }

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

export async function recordOwnBodyWeight({
  userId,
  weightKg,
}: {
  userId: string;
  weightKg: number;
}) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user || user.id !== userId) {
    throw new Error("Sessão inválida. Entre novamente para salvar seu peso.");
  }

  const { data: latest, error: latestError } = await supabase
    .from("athlete_body_measurements")
    .select("weight_kg")
    .eq("user_id", userId)
    .order("recorded_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestError) {
    throw latestError;
  }

  if (latest && Number(latest.weight_kg) === weightKg) {
    return latest;
  }

  const { data, error } = await supabase
    .from("athlete_body_measurements")
    .insert({ user_id: userId, weight_kg: weightKg })
    .select("id,user_id,weight_kg,recorded_at,created_at")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function markOwnNotificationsAsRead(userId: string) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user || user.id !== userId) {
    throw new Error("Sessão inválida.");
  }

  const { error } = await supabase
    .from("user_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("read_at", null);

  if (error) {
    throw error;
  }
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

export type UpdateMembershipRoleInput = {
  companyId: string;
  membershipId: string;
  role: MembershipRole;
};

export async function updateMembershipRole({
  companyId,
  membershipId,
  role,
}: UpdateMembershipRoleInput) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_company_membership_role", {
    p_company_id: companyId,
    p_membership_id: membershipId,
    p_role: role,
  });

  if (error) {
    throw error;
  }

}

export type DeleteMembershipInput = {
  companyId: string;
  membershipId: string;
};

export async function deleteMembership({
  companyId,
  membershipId,
}: DeleteMembershipInput) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_company_membership", {
    p_company_id: companyId,
    p_membership_id: membershipId,
  });

  if (error) {
    throw error;
  }

}

function createRawInvitationToken() {
  return randomBytes(32).toString("base64url");
}

function hashInvitationToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export type CreateCompanyInvitationInput = {
  companyId: string;
  createdBy: string;
  expiresAt: string;
};

export type CreatedCompanyInvitation = {
  invitation: CompanyInvitation;
  rawToken: string;
};

export async function createCompanyInvitation({
  companyId,
  createdBy,
  expiresAt,
}: CreateCompanyInvitationInput): Promise<CreatedCompanyInvitation> {
  const rawToken = createRawInvitationToken();
  const tokenHash = hashInvitationToken(rawToken);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("company_invitations")
    .insert({
      company_id: companyId,
      created_by: createdBy,
      expires_at: expiresAt,
      role: "client",
      token_hash: tokenHash,
    })
    .select(
      "id,company_id,role,created_by,used_by,accepted_email,expires_at,revoked_at,used_at,created_at,updated_at",
    )
    .single();

  if (error) {
    throw error;
  }

  return {
    invitation: data as CompanyInvitation,
    rawToken,
  };
}

export async function revokeCompanyInvitation(invitationId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("revoke_company_invite", {
    p_invitation_id: invitationId,
  });

  if (error) {
    throw error;
  }
}

export type CreateTrainingPlanDraftInput = {
  coachId?: string | null;
  companyId: string;
  defaultDurationSeconds?: number | null;
  groupLabel?: string | null;
  objective?: string | null;
  title: string;
  trainingMode?: TrainingMode;
};

export async function createTrainingPlanDraft({
  coachId = null,
  companyId,
  defaultDurationSeconds = null,
  groupLabel = null,
  objective = null,
  title,
  trainingMode = "coletivo",
}: CreateTrainingPlanDraftInput): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_training_plan_draft", {
    p_coach_id: coachId,
    p_company_id: companyId,
    p_default_duration_seconds: defaultDurationSeconds,
    p_group_label: groupLabel,
    p_objective: objective,
    p_title: title,
    p_training_mode: trainingMode,
  });

  if (error) {
    throw error;
  }

  return data as string;
}

export type CreateTrainingPlanVersionInput = {
  durationSeconds?: number | null;
  level?: TrainingVersionLevel;
  safetyNotes?: string | null;
  technicalNotes?: string | null;
  trainingPlanId: string;
};

export async function createTrainingPlanVersion({
  durationSeconds = null,
  level = "intermediario",
  safetyNotes = null,
  technicalNotes = null,
  trainingPlanId,
}: CreateTrainingPlanVersionInput): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_training_plan_version", {
    p_duration_seconds: durationSeconds,
    p_level: level,
    p_safety_notes: safetyNotes,
    p_technical_notes: technicalNotes,
    p_training_plan_id: trainingPlanId,
  });

  if (error) {
    throw error;
  }

  return data as string;
}

export async function saveTrainingBlocks({
  blocks,
  trainingPlanVersionId,
}: {
  blocks: TrainingBlockInput[];
  trainingPlanVersionId: string;
}) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("save_training_blocks", {
    p_blocks: blocks,
    p_training_plan_version_id: trainingPlanVersionId,
  });

  if (error) {
    throw error;
  }
}

export async function publishTrainingPlanVersion(
  trainingPlanVersionId: string,
) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("publish_training_plan_version", {
    p_training_plan_version_id: trainingPlanVersionId,
  });

  if (error) {
    throw error;
  }
}

export async function archiveTrainingPlan(trainingPlanId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("archive_training_plan", {
    p_training_plan_id: trainingPlanId,
  });

  if (error) {
    throw error;
  }
}
