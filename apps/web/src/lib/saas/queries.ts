import type {
  ActivityRecord,
  ActivitySessionCandidate,
  AthleteWeekSession,
  AthletePrivacySettings,
  AthleteBodyMeasurement,
  BaseSchedule,
  BaseScheduleResource,
  Booking,
  Company,
  CompanyActivityRecord,
  CompanyInvitation,
  CompanyLocation,
  CompanyMember,
  CompanySlot,
  CurrentUserBooking,
  LandingPage,
  MembershipRole,
  MembershipWithCompany,
  OperationalSession,
  OperationalSessionResource,
  Profile,
  SessionParticipant,
  PublicSportProfile,
  Resource,
  Service,
  SlotParticipant,
  TrainingBlock,
  TrainingPlanLibraryItem,
  TrainingPlanVersion,
  TrainingPlanWithVersion,
  UserNotification,
  WeeklyWorkout,
} from "../../types/saas";
import { createClient } from "./supabase-server";

type SupabaseJoin<T> = T | T[] | null;

function firstJoin<T>(value: SupabaseJoin<T>): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

function sanitizePublicDisplayName(name: string | null | undefined) {
  const cleanName = name?.trim();

  if (!cleanName || cleanName.includes("@")) {
    return "Remador BoraSport";
  }

  return cleanName;
}

function normalizeResource(resource: Partial<Resource> & Pick<Resource, "id" | "company_id" | "name" | "capacity_maxima" | "is_active" | "created_at" | "updated_at">): Resource {
  return {
    color: resource.color ?? null,
    company_id: resource.company_id,
    capacity_maxima: resource.capacity_maxima,
    created_at: resource.created_at,
    default_steerer_policy: resource.default_steerer_policy ?? null,
    id: resource.id,
    internal_code: resource.internal_code ?? null,
    location_id: resource.location_id ?? null,
    is_active: resource.is_active,
    name: resource.name,
    operational_notes: resource.operational_notes ?? null,
    updated_at: resource.updated_at,
    vessel_class: resource.vessel_class ?? null,
    vessel_status: resource.vessel_status ?? (resource.is_active ? "disponivel" : "inativa"),
  };
}

function normalizeBaseScheduleResource(
  row: Omit<BaseScheduleResource, "resource"> & {
    resources?: SupabaseJoin<Resource>;
  },
): BaseScheduleResource {
  return {
    company_id: row.company_id,
    created_at: row.created_at,
    resource: firstJoin(row.resources ?? null)
      ? normalizeResource(firstJoin(row.resources ?? null) as Resource)
      : null,
    resource_id: row.resource_id,
    schedule_id: row.schedule_id,
  };
}

function normalizeBaseSchedule(
  row: Omit<BaseSchedule, "coach" | "location" | "resources"> & {
    base_schedule_resources?: Array<
      Omit<BaseScheduleResource, "resource"> & { resources?: SupabaseJoin<Resource> }
    >;
    profiles?: SupabaseJoin<Pick<Profile, "avatar_url" | "id" | "name">>;
    company_locations?: SupabaseJoin<Pick<CompanyLocation, "address" | "id" | "name">>;
  },
): BaseSchedule {
  return {
    coach: firstJoin(row.profiles ?? null),
    coach_id: row.coach_id,
    company_id: row.company_id,
    created_at: row.created_at,
    created_by: row.created_by,
    duration_minutes: row.duration_minutes,
    group_name: row.group_name,
    id: row.id,
    level: row.level,
    location: firstJoin(row.company_locations ?? null),
    location_id: row.location_id,
    resources: (row.base_schedule_resources ?? []).map(
      normalizeBaseScheduleResource,
    ),
    start_time: row.start_time,
    status: row.status,
    updated_at: row.updated_at,
    weekday: row.weekday,
  };
}

function normalizeOperationalSessionResource(
  row: Omit<OperationalSessionResource, "resource"> & {
    resources?: SupabaseJoin<Resource>;
  },
): OperationalSessionResource {
  return {
    company_id: row.company_id,
    created_at: row.created_at,
    resource: firstJoin(row.resources ?? null)
      ? normalizeResource(firstJoin(row.resources ?? null) as Resource)
      : null,
    resource_id: row.resource_id,
    session_id: row.session_id,
  };
}

function normalizeOperationalSession(
  row: Omit<OperationalSession, "coach" | "location" | "resources" | "training_plan_version"> & {
    operational_session_resources?: Array<
      Omit<OperationalSessionResource, "resource"> & { resources?: SupabaseJoin<Resource> }
    >;
    profiles?: SupabaseJoin<Pick<Profile, "avatar_url" | "id" | "name">>;
    company_locations?: SupabaseJoin<Pick<CompanyLocation, "address" | "id" | "name">>;
    training_plan_versions?: SupabaseJoin<
      Omit<NonNullable<OperationalSession["training_plan_version"]>, "training_plan"> & {
        training_plans?: SupabaseJoin<
          NonNullable<OperationalSession["training_plan_version"]>["training_plan"]
        >;
      }
    >;
  },
): OperationalSession {
  const trainingVersion = firstJoin(row.training_plan_versions ?? null);

  return {
    base_schedule_id: row.base_schedule_id,
    coach: firstJoin(row.profiles ?? null),
    coach_id: row.coach_id,
    company_id: row.company_id,
    created_at: row.created_at,
    created_by: row.created_by,
    duration_minutes: row.duration_minutes,
    group_name: row.group_name,
    id: row.id,
    level: row.level,
    location: firstJoin(row.company_locations ?? null),
    location_id: row.location_id,
    resources: (row.operational_session_resources ?? []).map(
      normalizeOperationalSessionResource,
    ),
    session_date: row.session_date,
    start_time: row.start_time,
    status: row.status,
    training_plan_version: trainingVersion
      ? {
          company_id: trainingVersion.company_id,
          duration_seconds: trainingVersion.duration_seconds,
          id: trainingVersion.id,
          level: trainingVersion.level,
          published_at: trainingVersion.published_at,
          status: trainingVersion.status,
          training_plan: firstJoin(trainingVersion.training_plans ?? null),
          training_plan_id: trainingVersion.training_plan_id,
          version_number: trainingVersion.version_number,
        }
      : null,
    training_plan_version_id: row.training_plan_version_id,
    updated_at: row.updated_at,
  };
}

async function getRowsViaRest<T>(
  table: string,
  params: Record<string, string>,
): Promise<T[] | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  const url = new URL(`/rest/v1/${table}`, supabaseUrl);

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  const response = await fetch(url, {
    headers: {
      apikey: supabaseKey,
      authorization: `Bearer ${supabaseKey}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as T[];
}

async function getRowsViaRestOrThrow<T>(
  table: string,
  params: Record<string, string>,
): Promise<T[] | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  const url = new URL(`/rest/v1/${table}`, supabaseUrl);

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  const response = await fetch(url, {
    headers: {
      apikey: supabaseKey,
      authorization: `Bearer ${supabaseKey}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(
      `Supabase REST ${table} failed with ${response.status}: ${message}`,
    );
  }

  return (await response.json()) as T[];
}

export async function getCompanyBySlug(slug: string): Promise<Company | null> {
  const company = await getCompanyBySlugViaRest(slug);

  if (company) {
    return company;
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("companies")
    .select(
      "id, name, slug, logo_url, theme_colors, vocabulary_config, type_de_negocio, organization_kind, created_at, updated_at",
    )
    .eq("slug", slug)
    .maybeSingle();

  if (!error) {
    return data as Company | null;
  }

  if (error.code !== "42703" && !error.message.includes("type_de_negocio")) {
    throw error;
  }

  const fallback = await supabase
    .from("companies")
    .select(
      "id, name, slug, logo_url, theme_colors, vocabulary_config, created_at, updated_at",
    )
    .eq("slug", slug)
    .maybeSingle();

  if (fallback.error) {
    throw fallback.error;
  }

  return fallback.data
    ? ({ ...fallback.data, organization_kind: "club", type_de_negocio: null } as Company)
    : null;
}

export async function getDiscoverableCompanies(): Promise<Company[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("companies")
    .select("id,name,slug,logo_url,organization_kind,theme_colors,vocabulary_config,type_de_negocio,created_at,updated_at")
    .order("name", { ascending: true })
    .limit(50);

  if (error) return [];
  return (data as Company[] | null) ?? [];
}

async function getCompanyBySlugViaRest(slug: string): Promise<Company | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  const url = new URL("/rest/v1/companies", supabaseUrl);
  url.searchParams.set(
    "select",
    "id,name,slug,logo_url,theme_colors,vocabulary_config,type_de_negocio,organization_kind,created_at,updated_at",
  );
  url.searchParams.set("slug", `eq.${slug}`);
  url.searchParams.set("limit", "1");

  const response = await fetch(url, {
    headers: {
      apikey: supabaseKey,
      authorization: `Bearer ${supabaseKey}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  const rows = (await response.json()) as Company[];

  return rows[0] ?? null;
}

export async function getCompanySlots(
  companyId: string,
): Promise<CompanySlot[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("slots")
    .select(
      `
        id,
        company_id,
        service_id,
        resource_id,
        professional_id,
        start_time,
        end_time,
        spots_total,
        spots_occupied,
        operational_session_id,
        is_public,
        location_id,
        services!inner (
          id,
          name,
          description,
          duration_minutes,
          price
        ),
        resources (
          id,
          name,
          capacity_maxima
        ),
        company_locations (
          id,
          name,
          address,
          public_notes
        )
      `,
    )
    .eq("company_id", companyId)
    .gte("start_time", new Date().toISOString())
    .eq("is_public", true)
    .eq("services.is_active", true)
    .order("start_time", { ascending: true })
    .limit(12);

  if (!error && data && data.length > 0) {
    return data.map((slot) => ({
      ...slot,
      services: firstJoin(slot.services),
      resources: firstJoin(slot.resources),
      company_locations: firstJoin(slot.company_locations),
    })) as CompanySlot[];
  }

  const restRows = await getRowsViaRestOrThrow<CompanySlot>("slots", {
    select:
      "id,company_id,service_id,resource_id,professional_id,start_time,end_time,spots_total,spots_occupied,operational_session_id,is_public,location_id,services!inner(id,name,description,duration_minutes,price),resources(id,name,capacity_maxima),company_locations(id,name,address,public_notes)",
    company_id: `eq.${companyId}`,
    start_time: `gte.${new Date().toISOString()}`,
    is_public: "eq.true",
    "services.is_active": "eq.true",
    order: "start_time.asc",
    limit: "12",
  });

  return (restRows ?? []).map((slot) => ({
    ...slot,
    services: firstJoin(slot.services),
    resources: firstJoin(slot.resources),
    company_locations: firstJoin(slot.company_locations),
  })) as CompanySlot[];
}

export async function getCompanySlotParticipants(
  companyId: string,
): Promise<Record<string, SlotParticipant[]>> {
  const restRows = await getRowsViaRest<SlotParticipant>(
    "public_slot_participants",
    {
      select: "company_id,slot_id,public_profile_id,name,avatar_url",
      company_id: `eq.${companyId}`,
    },
  );

  const grouped: Record<string, SlotParticipant[]> = {};

  for (const participant of restRows ?? []) {
    grouped[participant.slot_id] = grouped[participant.slot_id] || [];
    grouped[participant.slot_id].push({
      ...participant,
      name: sanitizePublicDisplayName(participant.name),
    });
  }

  return grouped;
}

export async function getCurrentUserActiveBookings(
  companyId: string,
): Promise<CurrentUserBooking[]> {
  const user = await getCurrentUser();

  if (!user) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_my_active_bookings", {
    p_company_id: companyId,
  });

  if (error) {
    return [];
  }

  return (data ?? []) as CurrentUserBooking[];
}

export async function getPublicSportProfile(
  publicId: string,
): Promise<PublicSportProfile | null> {
  const restRows = await getRowsViaRest<PublicSportProfile>(
    "public_sport_profiles",
    {
      select: "public_id,name,avatar_url",
      public_id: `eq.${publicId}`,
      limit: "1",
    },
  );

  const profile = restRows?.[0] ?? null;

  return profile
    ? {
        ...profile,
        name: sanitizePublicDisplayName(profile.name),
      }
    : null;
}

function getCurrentWeekStartDate() {
  const now = new Date();
  const saoPauloDate = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
    year: "numeric",
  }).format(now);
  const date = new Date(`${saoPauloDate}T12:00:00-03:00`);
  const day = date.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diffToMonday);

  return new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
    year: "numeric",
  }).format(date);
}

export async function getCompanyWeeklyWorkouts(
  companyId: string,
): Promise<WeeklyWorkout[]> {
  const weekStartDate = getCurrentWeekStartDate();
  const restRows = await getRowsViaRest<WeeklyWorkout>("weekly_workouts", {
    select:
      "id,company_id,week_start_date,weekday,title,description,attachment_url,attachment_name,created_by,created_at,updated_at",
    company_id: `eq.${companyId}`,
    week_start_date: `eq.${weekStartDate}`,
    order: "weekday.asc",
  });

  if (restRows) {
    return restRows;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("weekly_workouts")
    .select(
      "id,company_id,week_start_date,weekday,title,description,attachment_url,attachment_name,created_by,created_at,updated_at",
    )
    .eq("company_id", companyId)
    .eq("week_start_date", weekStartDate)
    .order("weekday", { ascending: true });

  if (error) {
    if (error.code === "42P01") {
      return [];
    }

    throw error;
  }

  return (data ?? []) as WeeklyWorkout[];
}

export async function getCompanyLandingPage(
  companyId: string,
): Promise<LandingPage | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("landing_pages")
    .select(
      "id,company_id,slug,template_key,title,subtitle,hero_image_url,cta_label,cta_href,sections,is_published,created_by,created_at,updated_at",
    )
    .eq("company_id", companyId)
    .maybeSingle();

  if (error) {
    if (error.code === "42P01") {
      return null;
    }

    throw error;
  }

  return (data as LandingPage | null) ?? null;
}

export async function getPublishedLandingPageBySlug(
  slug: string,
): Promise<LandingPage | null> {
  const restRows = await getRowsViaRest<LandingPage>("landing_pages", {
    select:
      "id,company_id,slug,template_key,title,subtitle,hero_image_url,cta_label,cta_href,sections,is_published,created_by,created_at,updated_at",
    is_published: "eq.true",
    limit: "1",
    slug: `eq.${slug}`,
  });

  return restRows?.[0] ?? null;
}

export async function getCompanyResources(
  companyId: string,
): Promise<Resource[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("resources")
    .select(
      "id,company_id,name,capacity_maxima,is_active,vessel_class,vessel_status,default_steerer_policy,internal_code,location_id,operational_notes,color,created_at,updated_at",
    )
    .eq("company_id", companyId)
    .order("name", { ascending: true });

  if (!error && data && data.length > 0) {
    return data.map((resource) => normalizeResource(resource as Resource));
  }

  const restRows = await getRowsViaRest<Resource>("resources", {
    select: "id,company_id,name,capacity_maxima,is_active,created_at,updated_at",
    company_id: `eq.${companyId}`,
    order: "name.asc",
  });

  return (restRows ?? []).map((resource) => normalizeResource(resource));
}

export async function getCompanyResourceById(
  companyId: string,
  resourceId: string,
): Promise<Resource | null> {
  const resources = await getCompanyResources(companyId);

  return resources.find((resource) => resource.id === resourceId) ?? null;
}

export async function getCompanyLocations(
  companyId: string,
): Promise<CompanyLocation[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("company_locations")
    .select("id,company_id,name,address,public_notes,is_active,created_at,updated_at")
    .eq("company_id", companyId)
    .order("is_active", { ascending: false })
    .order("name", { ascending: true });

  if (error) {
    if (error.code === "42P01" || error.code === "42703") {
      return [];
    }

    throw error;
  }

  return (data ?? []) as CompanyLocation[];
}

export async function getCompanyLocationById(
  companyId: string,
  locationId: string,
): Promise<CompanyLocation | null> {
  const locations = await getCompanyLocations(companyId);
  return locations.find((location) => location.id === locationId) ?? null;
}

export async function getCompanyBaseSchedules(
  companyId: string,
): Promise<BaseSchedule[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("base_schedules")
    .select(
      `
        id,
        company_id,
        weekday,
        start_time,
        duration_minutes,
        group_name,
        level,
        location_id,
        coach_id,
        status,
        created_by,
        created_at,
        updated_at,
        profiles:coach_id (
          id,
          name,
          avatar_url
        ),
        company_locations (
          id,
          name,
          address
        ),
        base_schedule_resources (
          schedule_id,
          company_id,
          resource_id,
          created_at,
          resources (
            id,
            company_id,
            name,
            capacity_maxima,
            is_active,
            vessel_class,
            vessel_status,
            default_steerer_policy,
            internal_code,
            location_id,
            operational_notes,
            color,
            created_at,
            updated_at
          )
        )
      `,
    )
    .eq("company_id", companyId)
    .order("weekday", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) {
    if (error.code === "42P01" || error.code === "42703") {
      return [];
    }

    throw error;
  }

  return (data ?? []).map((row) => normalizeBaseSchedule(row as Parameters<typeof normalizeBaseSchedule>[0]));
}

export async function getCompanyBaseScheduleById(
  companyId: string,
  scheduleId: string,
): Promise<BaseSchedule | null> {
  const schedules = await getCompanyBaseSchedules(companyId);

  return schedules.find((schedule) => schedule.id === scheduleId) ?? null;
}

export async function getCompanyOperationalSessions({
  companyId,
  endDate,
  startDate,
}: {
  companyId: string;
  endDate: string;
  startDate: string;
}): Promise<OperationalSession[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("operational_sessions")
    .select(
      `
        id,
        company_id,
        session_date,
        start_time,
        duration_minutes,
        group_name,
        level,
        location_id,
        base_schedule_id,
        coach_id,
        training_plan_version_id,
        status,
        created_by,
        created_at,
        updated_at,
        profiles:coach_id (
          id,
          name,
          avatar_url
        ),
        company_locations (
          id,
          name,
          address
        ),
        training_plan_versions:training_plan_versions!operational_sessions_training_version_company_fk (
          id,
          company_id,
          training_plan_id,
          version_number,
          level,
          status,
          duration_seconds,
          published_at,
          training_plans:training_plans!training_plan_versions_plan_company_fk (
            id,
            title,
            objective,
            training_mode
          )
        ),
        operational_session_resources (
          session_id,
          company_id,
          resource_id,
          created_at,
          resources (
            id,
            company_id,
            name,
            capacity_maxima,
            is_active,
            vessel_class,
            vessel_status,
            default_steerer_policy,
            internal_code,
            location_id,
            operational_notes,
            color,
            created_at,
            updated_at
          )
        )
      `,
    )
    .eq("company_id", companyId)
    .gte("session_date", startDate)
    .lte("session_date", endDate)
    .order("session_date", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) {
    if (error.code === "42P01" || error.code === "42703") {
      return [];
    }

    throw error;
  }

  return (data ?? []).map((row) =>
    normalizeOperationalSession(
      row as Parameters<typeof normalizeOperationalSession>[0],
    ),
  );
}

export async function getCompanyOperationalSessionById({
  companyId,
  sessionId,
}: {
  companyId: string;
  sessionId: string;
}): Promise<OperationalSession | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("operational_sessions")
    .select(
      `
        id,
        company_id,
        session_date,
        start_time,
        duration_minutes,
        group_name,
        level,
        location_id,
        base_schedule_id,
        coach_id,
        training_plan_version_id,
        status,
        created_by,
        created_at,
        updated_at,
        profiles:coach_id (
          id,
          name,
          avatar_url
        ),
        company_locations (
          id,
          name,
          address
        ),
        training_plan_versions:training_plan_versions!operational_sessions_training_version_company_fk (
          id,
          company_id,
          training_plan_id,
          version_number,
          level,
          status,
          duration_seconds,
          published_at,
          training_plans:training_plans!training_plan_versions_plan_company_fk (
            id,
            title,
            objective,
            training_mode
          )
        ),
        operational_session_resources (
          session_id,
          company_id,
          resource_id,
          created_at,
          resources (
            id,
            company_id,
            name,
            capacity_maxima,
            is_active,
            vessel_class,
            vessel_status,
            default_steerer_policy,
            internal_code,
            location_id,
            operational_notes,
            color,
            created_at,
            updated_at
          )
        )
      `,
    )
    .eq("company_id", companyId)
    .eq("id", sessionId)
    .maybeSingle();

  if (error) {
    if (error.code === "42P01" || error.code === "42703") {
      return null;
    }

    throw error;
  }

  return data
    ? normalizeOperationalSession(
        data as Parameters<typeof normalizeOperationalSession>[0],
      )
    : null;
}

export async function getOperationalSessionParticipants({
  companyId,
  sessionId,
}: {
  companyId: string;
  sessionId: string;
}): Promise<SessionParticipant[]> {
  const supabase = await createClient();
  const { data: slot, error: slotError } = await supabase
    .from("slots")
    .select("id")
    .eq("company_id", companyId)
    .eq("operational_session_id", sessionId)
    .maybeSingle();

  if (slotError || !slot) {
    return [];
  }

  const { data: bookings, error } = await supabase
    .from("bookings")
    .select("id,slot_id,user_id,company_id,status,created_at,updated_at")
    .eq("company_id", companyId)
    .eq("slot_id", slot.id)
    .neq("status", "cancelled")
    .order("created_at", { ascending: true });

  if (error || !bookings?.length) {
    return [];
  }

  const userIds = bookings.map((booking) => booking.user_id);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id,name,phone,avatar_url")
    .in("id", userIds);
  const profilesById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));

  return bookings.map((booking) => ({
    ...booking,
    profile: profilesById.get(booking.user_id) ?? null,
  })) as SessionParticipant[];
}

export async function getCompanyServices(
  companyId: string,
): Promise<Service[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("services")
    .select("*")
    .eq("company_id", companyId)
    .order("name", { ascending: true });

  if (!error && data && data.length > 0) {
    return data as Service[];
  }

  const restRows = await getRowsViaRest<Service>("services", {
    select:
      "id,company_id,name,description,duration_minutes,price,is_active,created_at,updated_at",
    company_id: `eq.${companyId}`,
    order: "name.asc",
  });

  return (restRows ?? []) as Service[];
}

export async function getCompanyBookings(
  companyId: string,
): Promise<Booking[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (!error && data && data.length > 0) {
    return data as Booking[];
  }

  const restRows = await getRowsViaRest<Booking>("bookings", {
    select: "id,slot_id,user_id,company_id,status,created_at,updated_at",
    company_id: `eq.${companyId}`,
    order: "created_at.desc",
    limit: "20",
  });

  return (restRows ?? []) as Booking[];
}

export async function getCompanyMembers(
  companyId: string,
): Promise<CompanyMember[]> {
  const supabase = await createClient();

  const { data: memberships, error } = await supabase
    .from("memberships")
    .select("id,user_id,company_id,role,created_at,updated_at")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error || !memberships || memberships.length === 0) {
    return [];
  }

  const userIds = memberships.map((membership) => membership.user_id);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id,name,phone,avatar_url")
    .in("id", userIds);

  const profilesById = new Map(
    (profiles ?? []).map((profile) => [profile.id, profile]),
  );

  return memberships.map((membership) => ({
    ...membership,
    profile: profilesById.get(membership.user_id) ?? null,
  })) as CompanyMember[];
}

export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    return null;
  }

  return user;
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id,name,phone,avatar_url,created_at,updated_at")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    return null;
  }

  return (data as Profile | null) ?? null;
}

export async function getCurrentUserLatestBodyMeasurement(): Promise<AthleteBodyMeasurement | null> {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("athlete_body_measurements")
    .select("id,user_id,weight_kg,recorded_at,created_at")
    .eq("user_id", user.id)
    .order("recorded_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return null;
  }

  return (data as AthleteBodyMeasurement | null) ?? null;
}

export async function getCurrentUserBodyMeasurements(): Promise<AthleteBodyMeasurement[]> {
  const user = await getCurrentUser();

  if (!user) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("athlete_body_measurements")
    .select("id,user_id,weight_kg,recorded_at,created_at")
    .eq("user_id", user.id)
    .order("recorded_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(24);

  if (error) {
    return [];
  }

  return (data as AthleteBodyMeasurement[] | null) ?? [];
}

export async function getCurrentUserNotifications(): Promise<UserNotification[]> {
  const user = await getCurrentUser();

  if (!user) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_notifications")
    .select("id,user_id,company_id,slot_id,kind,title,message,read_at,created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return [];
  }

  return (data as UserNotification[] | null) ?? [];
}

export async function getCurrentUserActivityRecords(): Promise<ActivityRecord[]> {
  const user = await getCurrentUser();

  if (!user) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("activity_records")
    .select(
      "id,company_id,operational_session_id,provider,activity_type,title,started_at,duration_seconds,distance_meters,average_heart_rate,visibility,attendance_validation_status,attendance_validation_source,attendance_validated_at,route_privacy_mode,athlete_rpe,athlete_feeling,athlete_pain,athlete_notes,athlete_feedback_at",
    )
    .eq("user_id", user.id)
    .order("started_at", { ascending: false });

  if (error) {
    return [];
  }

  return (data as ActivityRecord[] | null) ?? [];
}

export async function getCompanyActivityRecords(companyId: string): Promise<CompanyActivityRecord[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("activity_records")
    .select("id,company_id,operational_session_id,provider,activity_type,title,started_at,duration_seconds,distance_meters,average_heart_rate,visibility,attendance_validation_status,attendance_validation_source,attendance_validated_at,route_privacy_mode,athlete_rpe,athlete_feeling,athlete_pain,athlete_notes,athlete_feedback_at,athlete:user_id(id,name,avatar_url)")
    .eq("company_id", companyId)
    .order("started_at", { ascending: false })
    .limit(100);

  if (error) return [];
  return (data ?? []).map((activity) => ({
    ...activity,
    athlete: firstJoin(activity.athlete),
  })) as CompanyActivityRecord[];
}

export async function getCurrentUserWeekSessions(): Promise<AthleteWeekSession[]> {
  const memberships = await getCurrentUserMemberships();
  if (!memberships.length) return [];

  const companyNames = new Map(
    memberships.flatMap((membership) => membership.companies
      ? [[membership.company_id, membership.companies.name] as const]
      : []),
  );
  const now = new Date();
  const day = (now.getUTCDay() + 6) % 7;
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - day));
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("operational_sessions")
    .select(`
      id,company_id,session_date,start_time,duration_minutes,group_name,
      training_plan_versions:training_plan_versions!operational_sessions_training_version_company_fk (
        id,company_id,training_plan_id,version_number,level,status,duration_seconds,published_at,
        training_plans:training_plans!training_plan_versions_plan_company_fk (
          id,title,objective,training_mode
        ),
        training_blocks (
          id,company_id,training_plan_version_id,parent_block_id,block_kind,block_type,name,instruction,sort_order,duration_seconds,bora_zone,heart_rate_min,heart_rate_max,repeat_count,target_type,target_value,created_at,updated_at
        )
      )
    `)
    .in("company_id", memberships.map((membership) => membership.company_id))
    .eq("status", "published")
    .gte("session_date", start.toISOString().slice(0, 10))
    .lte("session_date", end.toISOString().slice(0, 10))
    .order("session_date", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) return [];

  return (data ?? []).map((row) => {
    const version = firstJoin(row.training_plan_versions);
    return {
      company_id: row.company_id,
      company_name: companyNames.get(row.company_id) ?? "Organização",
      duration_minutes: row.duration_minutes,
      group_name: row.group_name,
      id: row.id,
      session_date: row.session_date,
      start_time: row.start_time,
      training_blocks: version?.training_blocks ?? [],
      training_plan_version: version ? {
        company_id: version.company_id,
        duration_seconds: version.duration_seconds,
        id: version.id,
        level: version.level,
        published_at: version.published_at,
        status: version.status,
        training_plan: firstJoin(version.training_plans),
        training_plan_id: version.training_plan_id,
        version_number: version.version_number,
      } : null,
    };
  }) as AthleteWeekSession[];
}

export async function getCurrentAthletePrivacySettings(): Promise<AthletePrivacySettings | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("athlete_privacy_settings")
    .select("user_id,rankings_opt_in,challenges_opt_in,hide_route_start_end")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return null;
  return data as AthletePrivacySettings | null;
}

export async function getCurrentUserSessionCandidates(): Promise<ActivitySessionCandidate[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const memberships = await getCurrentUserMemberships();
  if (!memberships.length) return [];

  const companyNames = new Map(
    memberships.flatMap((membership) =>
      membership.companies
        ? [[membership.company_id, membership.companies.name] as const]
        : [],
    ),
  );
  const start = new Date();
  start.setDate(start.getDate() - 45);
  const end = new Date();
  end.setDate(end.getDate() + 14);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("operational_sessions")
    .select("id,company_id,group_name,session_date,start_time")
    .in("company_id", memberships.map((membership) => membership.company_id))
    .eq("status", "published")
    .gte("session_date", start.toISOString().slice(0, 10))
    .lte("session_date", end.toISOString().slice(0, 10))
    .order("session_date", { ascending: false })
    .order("start_time", { ascending: false });

  if (error) return [];

  return (data ?? []).map((session) => ({
    ...session,
    company_name: companyNames.get(session.company_id) ?? "Organização",
  })) as ActivitySessionCandidate[];
}

export async function getCurrentUserMemberships(): Promise<MembershipWithCompany[]> {
  const user = await getCurrentUser();

  if (!user) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("memberships")
    .select(
      `
        id,
        user_id,
        company_id,
        role,
        created_at,
        updated_at,
        companies:company_id (
          id,
          name,
          slug,
          logo_url,
          organization_kind
        )
      `,
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error) {
    return [];
  }

  return (data ?? []).map((membership) => ({
    ...membership,
    companies: firstJoin(membership.companies),
  })) as MembershipWithCompany[];
}

export async function getUserCompanyRole(
  companyId: string,
  userId: string,
): Promise<MembershipRole | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("memberships")
    .select("role")
    .eq("company_id", companyId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return null;
  }

  return (data?.role as MembershipRole | undefined) ?? null;
}

export async function companyHasMembers(companyId: string): Promise<boolean> {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from("memberships")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId);

  if (error) {
    return true;
  }

  return (count ?? 0) > 0;
}

export async function getCompanyInvitations(
  companyId: string,
): Promise<CompanyInvitation[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("company_invitations")
    .select(
      "id,company_id,role,created_by,used_by,accepted_email,expires_at,revoked_at,used_at,created_at,updated_at",
    )
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) {
    if (error.code === "42P01") {
      return [];
    }

    throw error;
  }

  return (data ?? []) as CompanyInvitation[];
}

export async function getCompanyTrainingLibrary(
  companyId: string,
): Promise<TrainingPlanLibraryItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("training_plans")
    .select(
      `
        id,
        company_id,
        title,
        objective,
        training_mode,
        default_duration_seconds,
        group_label,
        coach_id,
        status,
        created_by,
        archived_at,
        created_at,
        updated_at,
        training_plan_versions (
          id,
          version_number,
          level,
          status,
          duration_seconds,
          published_at
        )
      `,
    )
    .eq("company_id", companyId)
    .order("updated_at", { ascending: false });

  if (error) {
    if (error.code === "42P01" || error.code === "42703") {
      return [];
    }

    throw error;
  }

  return (data ?? []).map((plan) => ({
    ...plan,
    training_plan_versions: Array.isArray(plan.training_plan_versions)
      ? plan.training_plan_versions
      : [],
  })) as TrainingPlanLibraryItem[];
}

export async function getTrainingPlanVersions(
  trainingPlanId: string,
): Promise<TrainingPlanVersion[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("training_plan_versions")
    .select(
      "id,company_id,training_plan_id,version_number,level,status,duration_seconds,technical_notes,safety_notes,published_at,created_by,created_at,updated_at",
    )
    .eq("training_plan_id", trainingPlanId)
    .order("version_number", { ascending: false });

  if (error) {
    if (error.code === "42P01" || error.code === "42703") {
      return [];
    }

    throw error;
  }

  return (data ?? []) as TrainingPlanVersion[];
}

export async function getTrainingPlanWithVersion({
  companyId,
  trainingPlanId,
  versionId,
}: {
  companyId: string;
  trainingPlanId: string;
  versionId?: string | null;
}): Promise<TrainingPlanWithVersion | null> {
  const supabase = await createClient();

  const { data: plan, error: planError } = await supabase
    .from("training_plans")
    .select(
      "id,company_id,title,objective,training_mode,default_duration_seconds,group_label,coach_id,status,created_by,archived_at,created_at,updated_at",
    )
    .eq("company_id", companyId)
    .eq("id", trainingPlanId)
    .maybeSingle();

  if (planError) {
    if (planError.code === "42P01" || planError.code === "42703") {
      return null;
    }

    throw planError;
  }

  if (!plan) {
    return null;
  }

  let versionQuery = supabase
    .from("training_plan_versions")
    .select(
      "id,company_id,training_plan_id,version_number,level,status,duration_seconds,technical_notes,safety_notes,published_at,created_by,created_at,updated_at",
    )
    .eq("company_id", companyId)
    .eq("training_plan_id", trainingPlanId);

  if (versionId) {
    versionQuery = versionQuery.eq("id", versionId);
  } else {
    versionQuery = versionQuery.order("version_number", { ascending: false }).limit(1);
  }

  const { data: versions, error: versionError } = await versionQuery;

  if (versionError) {
    throw versionError;
  }

  const version = (versions?.[0] ?? null) as TrainingPlanVersion | null;

  if (!version) {
    return {
      blocks: [],
      plan: plan as TrainingPlanWithVersion["plan"],
      version: null,
    };
  }

  const { data: blocks, error: blocksError } = await supabase
    .from("training_blocks")
    .select(
      "id,company_id,training_plan_version_id,parent_block_id,block_kind,block_type,name,instruction,sort_order,duration_seconds,bora_zone,heart_rate_min,heart_rate_max,repeat_count,target_type,target_value,created_at,updated_at",
    )
    .eq("company_id", companyId)
    .eq("training_plan_version_id", version.id)
    .order("sort_order", { ascending: true });

  if (blocksError) {
    throw blocksError;
  }

  return {
    blocks: (blocks ?? []) as TrainingBlock[],
    plan: plan as TrainingPlanWithVersion["plan"],
    version,
  };
}
