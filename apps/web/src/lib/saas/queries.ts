import type {
  Booking,
  Company,
  CompanySlot,
  LandingPage,
  MembershipRole,
  Profile,
  Resource,
  Service,
  SlotParticipant,
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

export async function getCompanyBySlug(slug: string): Promise<Company | null> {
  const company = await getCompanyBySlugViaRest(slug);

  if (company) {
    return company;
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("companies")
    .select(
      "id, name, slug, logo_url, theme_colors, vocabulary_config, type_de_negocio, created_at, updated_at",
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
    ? ({ ...fallback.data, type_de_negocio: null } as Company)
    : null;
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
    "id,name,slug,logo_url,theme_colors,vocabulary_config,type_de_negocio,created_at,updated_at",
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
        services:service_id (
          id,
          name,
          description,
          duration_minutes,
          price
        ),
        resources:resource_id (
          id,
          name,
          capacity_maxima
        )
      `,
    )
    .eq("company_id", companyId)
    .gte("start_time", new Date().toISOString())
    .order("start_time", { ascending: true })
    .limit(12);

  if (!error && data && data.length > 0) {
    return data.map((slot) => ({
      ...slot,
      services: firstJoin(slot.services),
      resources: firstJoin(slot.resources),
    })) as CompanySlot[];
  }

  const restRows = await getRowsViaRest<CompanySlot>("slots", {
    select:
      "id,company_id,service_id,resource_id,professional_id,start_time,end_time,spots_total,spots_occupied,services:service_id(id,name,description,duration_minutes,price),resources:resource_id(id,name,capacity_maxima)",
    company_id: `eq.${companyId}`,
    start_time: `gte.${new Date().toISOString()}`,
    order: "start_time.asc",
    limit: "12",
  });

  return (restRows ?? []).map((slot) => ({
    ...slot,
    services: firstJoin(slot.services),
    resources: firstJoin(slot.resources),
  })) as CompanySlot[];
}

export async function getCompanySlotParticipants(
  companyId: string,
): Promise<Record<string, SlotParticipant[]>> {
  const restRows = await getRowsViaRest<SlotParticipant>(
    "public_slot_participants",
    {
      select: "company_id,slot_id,user_id,name,avatar_url",
      company_id: `eq.${companyId}`,
    },
  );

  const grouped: Record<string, SlotParticipant[]> = {};

  for (const participant of restRows ?? []) {
    grouped[participant.slot_id] = grouped[participant.slot_id] || [];
    grouped[participant.slot_id].push(participant);
  }

  return grouped;
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
    .select("*")
    .eq("company_id", companyId)
    .order("name", { ascending: true });

  if (!error && data && data.length > 0) {
    return data as Resource[];
  }

  const restRows = await getRowsViaRest<Resource>("resources", {
    select: "id,company_id,name,capacity_maxima,is_active,created_at,updated_at",
    company_id: `eq.${companyId}`,
    order: "name.asc",
  });

  return (restRows ?? []) as Resource[];
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
