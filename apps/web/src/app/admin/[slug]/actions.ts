"use server";

import { revalidatePath } from "next/cache";

import {
  createMembership,
  createResource,
  createService,
  createSlot,
  createSlotsSkippingDuplicates,
  ensureProfile,
  updateCompanyConfiguration,
  upsertLandingPage,
  upsertWeeklyWorkout,
} from "../../../lib/saas/mutations";
import { getCurrentUser, getUserCompanyRole } from "../../../lib/saas/queries";
import type { VocabularyConfig } from "../../../types/saas";

export type CompanyConfigurationState = {
  error?: string;
  success?: string;
};

export type AdminFormState = {
  error?: string;
  success?: string;
};

const defaultVocabulary: Required<VocabularyConfig> = {
  booking_label: "Reserva",
  professional_label: "Profissional",
  resource_label: "Recurso",
  service_label: "Servico",
};

function readText(formData: FormData, key: string, fallback: string) {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return fallback;
  }

  return value.trim() || fallback;
}

function readNumber(formData: FormData, key: string, fallback: number) {
  const value = Number(readText(formData, key, String(fallback)));

  if (!Number.isFinite(value)) {
    return fallback;
  }

  return value;
}

function readOptionalText(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return null;
  }

  return value.trim() || null;
}

function readTextList(formData: FormData, key: string) {
  return formData
    .getAll(key)
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean);
}

function dateKeyInSaoPaulo(value: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
    year: "numeric",
  }).format(value);
}

function revalidateTenantPages(slug: string) {
  revalidatePath(`/admin/${slug}`);
  revalidatePath(`/clube/${slug}`);
}

async function assertCanManageTenant(companyId: string) {
  const user = await getCurrentUser();

  if (!user) {
    return "Sessao expirada. Entre novamente para salvar.";
  }

  const role = await getUserCompanyRole(companyId, user.id);

  if (role !== "admin" && role !== "professional") {
    return "Seu usuario ainda nao tem permissao de admin/profissional neste tenant. Assuma o tenant ou ajuste a membership.";
  }

  return null;
}

function getReadableError(error: unknown) {
  const message = error instanceof Error ? error.message : "Erro desconhecido";

  if (
    message.includes("row-level security") ||
    message.includes("permission denied")
  ) {
    return "Permissao negada pelo Supabase/RLS. Confira se seu usuario tem membership admin/professional neste tenant.";
  }

  if (message.includes("violates foreign key constraint")) {
    return "Dados relacionados nao existem no banco. Confira se o recurso/servico pertence ao mesmo tenant.";
  }

  if (message.includes("Bucket not found")) {
    return "Bucket de arquivos nao existe. Rode a migration de storage correspondente no Supabase.";
  }

  return message;
}

export async function saveCompanyConfiguration(
  _previousState: CompanyConfigurationState,
  formData: FormData,
): Promise<CompanyConfigurationState> {
  const companyId = readText(formData, "companyId", "");
  const slug = readText(formData, "slug", "");
  const typeDeNegocio = readText(formData, "typeDeNegocio", "generico");

  if (!companyId || !slug) {
    return {
      error: "Nao foi possivel identificar o tenant para salvar.",
    };
  }

  const accessError = await assertCanManageTenant(companyId);

  if (accessError) {
    return { error: accessError };
  }

  const vocabularyConfig: Required<VocabularyConfig> = {
    booking_label: readText(
      formData,
      "bookingLabel",
      defaultVocabulary.booking_label,
    ),
    professional_label: readText(
      formData,
      "professionalLabel",
      defaultVocabulary.professional_label,
    ),
    resource_label: readText(
      formData,
      "resourceLabel",
      defaultVocabulary.resource_label,
    ),
    service_label: readText(
      formData,
      "serviceLabel",
      defaultVocabulary.service_label,
    ),
  };

  try {
    await updateCompanyConfiguration({
      companyId,
      typeDeNegocio,
      vocabularyConfig,
    });
  } catch (error) {
    return {
      error: `Nao foi possivel salvar. ${getReadableError(error)}`,
    };
  }

  revalidateTenantPages(slug);

  return {
    success: "Configuracao salva.",
  };
}

export async function saveResource(
  _previousState: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const companyId = readText(formData, "companyId", "");
  const slug = readText(formData, "slug", "");
  const resourceLabel = readText(formData, "resourceLabel", "Recurso");
  const name = readText(formData, "name", "");
  const capacityMaxima = Math.max(1, Math.floor(readNumber(formData, "capacityMaxima", 1)));

  if (!companyId || !slug) {
    return { error: "Nao foi possivel identificar o tenant." };
  }

  const accessError = await assertCanManageTenant(companyId);

  if (accessError) {
    return { error: accessError };
  }

  if (!name) {
    return { error: `Informe o nome do ${resourceLabel.toLowerCase()}.` };
  }

  try {
    await createResource({
      capacityMaxima,
      companyId,
      name,
    });
  } catch (error) {
    return {
      error: `Nao foi possivel cadastrar. ${getReadableError(error)}`,
    };
  }

  revalidateTenantPages(slug);

  return {
    success: `${resourceLabel} cadastrado.`,
  };
}

export async function saveService(
  _previousState: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const companyId = readText(formData, "companyId", "");
  const slug = readText(formData, "slug", "");
  const serviceLabel = readText(formData, "serviceLabel", "Servico");
  const name = readText(formData, "name", "");
  const description = readText(formData, "description", "");
  const durationMinutes = Math.max(
    5,
    Math.floor(readNumber(formData, "durationMinutes", 50)),
  );
  const price = Math.max(0, readNumber(formData, "price", 0));

  if (!companyId || !slug) {
    return { error: "Nao foi possivel identificar o tenant." };
  }

  const accessError = await assertCanManageTenant(companyId);

  if (accessError) {
    return { error: accessError };
  }

  if (!name) {
    return { error: `Informe o nome do ${serviceLabel.toLowerCase()}.` };
  }

  try {
    await createService({
      companyId,
      description: description || null,
      durationMinutes,
      name,
      price,
    });
  } catch (error) {
    return {
      error: `Nao foi possivel cadastrar. ${getReadableError(error)}`,
    };
  }

  revalidateTenantPages(slug);

  return {
    success: `${serviceLabel} cadastrado.`,
  };
}

export async function saveSlot(
  _previousState: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const companyId = readText(formData, "companyId", "");
  const slug = readText(formData, "slug", "");
  const serviceLabel = readText(formData, "serviceLabel", "Servico");
  const resourceLabel = readText(formData, "resourceLabel", "Recurso");
  const serviceId = readText(formData, "serviceId", "");
  const resourceId = readOptionalText(formData, "resourceId");
  const date = readText(formData, "date", "");
  const time = readText(formData, "time", "");
  const durationMinutes = Math.max(
    5,
    Math.floor(readNumber(formData, "durationMinutes", 50)),
  );
  const spotsTotal = Math.max(1, Math.floor(readNumber(formData, "spotsTotal", 1)));

  if (!companyId || !slug) {
    return { error: "Nao foi possivel identificar o tenant." };
  }

  const accessError = await assertCanManageTenant(companyId);

  if (accessError) {
    return { error: accessError };
  }

  if (!serviceId) {
    return { error: `Selecione um ${serviceLabel.toLowerCase()}.` };
  }

  if (!date || !time) {
    return { error: "Informe data e horario." };
  }

  if (!resourceId) {
    return { error: `Selecione um ${resourceLabel.toLowerCase()}.` };
  }

  const startDate = new Date(`${date}T${time}:00-03:00`);

  if (Number.isNaN(startDate.getTime())) {
    return { error: "Data ou horario invalido." };
  }

  if (startDate.getTime() <= Date.now()) {
    return {
      error:
        "Esse horario ja passou. Publique um horario futuro para aparecer na pagina publica.",
    };
  }

  const endDate = new Date(startDate.getTime() + durationMinutes * 60_000);

  try {
    await createSlot({
      companyId,
      endTime: endDate.toISOString(),
      resourceId,
      serviceId,
      spotsTotal,
      startTime: startDate.toISOString(),
    });
  } catch (error) {
    return {
      error: `Nao foi possivel publicar o horario. ${getReadableError(error)}`,
    };
  }

  revalidateTenantPages(slug);

  return {
    success: "Horario publicado.",
  };
}

export async function saveWeeklySlots(
  _previousState: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const companyId = readText(formData, "companyId", "");
  const slug = readText(formData, "slug", "");
  const serviceLabel = readText(formData, "serviceLabel", "Servico");
  const resourceLabel = readText(formData, "resourceLabel", "Recurso");
  const serviceId = readText(formData, "weeklyServiceId", "");
  const resourceId = readOptionalText(formData, "weeklyResourceId");
  const dateStart = readText(formData, "dateStart", "");
  const dateEnd = readText(formData, "dateEnd", "");
  const durationMinutes = Math.max(
    5,
    Math.floor(readNumber(formData, "weeklyDurationMinutes", 60)),
  );
  const spotsTotal = Math.max(
    1,
    Math.floor(readNumber(formData, "weeklySpotsTotal", 6)),
  );
  const weekdays = readTextList(formData, "weekdays").map(Number);
  const times = [
    readOptionalText(formData, "timeOne"),
    readOptionalText(formData, "timeTwo"),
  ].filter((value): value is string => Boolean(value));

  if (!companyId || !slug) {
    return { error: "Nao foi possivel identificar o tenant." };
  }

  const accessError = await assertCanManageTenant(companyId);

  if (accessError) {
    return { error: accessError };
  }

  if (!serviceId) {
    return { error: `Selecione um ${serviceLabel.toLowerCase()}.` };
  }

  if (!resourceId) {
    return { error: `Selecione um ${resourceLabel.toLowerCase()}.` };
  }

  if (!dateStart || !dateEnd) {
    return { error: "Informe o periodo da grade semanal." };
  }

  if (times.length === 0) {
    return { error: "Informe pelo menos um horario da grade semanal." };
  }

  const selectedWeekdays = weekdays.length > 0 ? weekdays : [1, 2, 3, 4, 5];
  const rangeStart = new Date(`${dateStart}T12:00:00-03:00`);
  const rangeEnd = new Date(`${dateEnd}T12:00:00-03:00`);

  if (
    Number.isNaN(rangeStart.getTime()) ||
    Number.isNaN(rangeEnd.getTime()) ||
    rangeEnd.getTime() < rangeStart.getTime()
  ) {
    return { error: "Periodo invalido." };
  }

  const slotsToCreate = [];
  const cursor = new Date(rangeStart);

  while (cursor.getTime() <= rangeEnd.getTime()) {
    if (selectedWeekdays.includes(cursor.getDay())) {
      const dateKey = dateKeyInSaoPaulo(cursor);

      for (const time of times) {
        const startDate = new Date(`${dateKey}T${time}:00-03:00`);

        if (startDate.getTime() <= Date.now()) {
          continue;
        }

        const endDate = new Date(startDate.getTime() + durationMinutes * 60_000);
        slotsToCreate.push({
          companyId,
          endTime: endDate.toISOString(),
          resourceId,
          serviceId,
          spotsTotal,
          startTime: startDate.toISOString(),
        });
      }
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  if (slotsToCreate.length === 0) {
    return {
      error:
        "Nenhum horario futuro encontrado nesse periodo. Ajuste as datas ou horarios.",
    };
  }

  if (slotsToCreate.length > 80) {
    return {
      error:
        "A grade geraria horarios demais de uma vez. Reduza o periodo ou a quantidade de horarios.",
    };
  }

  try {
    const createdSlots = await createSlotsSkippingDuplicates(slotsToCreate);
    revalidateTenantPages(slug);

    if (createdSlots.length === 0) {
      return {
        success:
          "A grade ja estava publicada. Nenhum horario duplicado foi criado.",
      };
    }

    return {
      success: `${createdSlots.length} horario${
        createdSlots.length === 1 ? "" : "s"
      } publicado${createdSlots.length === 1 ? "" : "s"} na agenda publica.`,
    };
  } catch (error) {
    return {
      error: `Nao foi possivel publicar a grade semanal. ${getReadableError(
        error,
      )}`,
    };
  }
}

function currentWeekStartDate() {
  const now = new Date();
  const dateKey = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
    year: "numeric",
  }).format(now);
  const date = new Date(`${dateKey}T12:00:00-03:00`);
  const day = date.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diffToMonday);

  return dateKeyInSaoPaulo(date);
}

function readFile(formData: FormData, key: string) {
  const value = formData.get(key);

  if (!(value instanceof File) || value.size === 0) {
    return null;
  }

  return value;
}

export async function saveWeeklyWorkout(
  _previousState: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const companyId = readText(formData, "companyId", "");
  const slug = readText(formData, "slug", "");
  const weekStartDate = readText(
    formData,
    "workoutWeekStartDate",
    currentWeekStartDate(),
  );
  const weekday = Math.max(
    1,
    Math.min(7, Math.floor(readNumber(formData, "workoutWeekday", 1))),
  );
  const title = readText(formData, "workoutTitle", "");
  const description = readText(formData, "workoutDescription", "");
  const attachmentFile = readFile(formData, "workoutAttachment");

  if (!companyId || !slug) {
    return { error: "Nao foi possivel identificar o tenant." };
  }

  const user = await getCurrentUser();

  if (!user) {
    return { error: "Sessao expirada. Entre novamente para salvar." };
  }

  const accessError = await assertCanManageTenant(companyId);

  if (accessError) {
    return { error: accessError };
  }

  if (!title) {
    return { error: "Informe o nome do treino do dia." };
  }

  try {
    await upsertWeeklyWorkout({
      attachmentFile,
      companyId,
      createdBy: user.id,
      description: description || null,
      title,
      weekday,
      weekStartDate,
    });
  } catch (error) {
    return {
      error: `Nao foi possivel salvar o treino da semana. ${getReadableError(
        error,
      )}`,
    };
  }

  revalidateTenantPages(slug);

  return {
    success: "Treino da semana publicado para os alunos.",
  };
}

export async function saveLandingPage(
  _previousState: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const companyId = readText(formData, "companyId", "");
  const slug = readText(formData, "slug", "");
  const title = readText(formData, "landingTitle", "");
  const subtitle = readText(formData, "landingSubtitle", "");
  const ctaLabel = readText(formData, "landingCtaLabel", "Agendar agora");
  const offerOne = readText(formData, "landingOfferOne", "");
  const offerTwo = readText(formData, "landingOfferTwo", "");
  const offerThree = readText(formData, "landingOfferThree", "");
  const isPublished = readText(formData, "landingPublished", "") === "on";
  const heroImageFile = readFile(formData, "landingHeroImage");

  if (!companyId || !slug) {
    return { error: "Nao foi possivel identificar o tenant." };
  }

  const user = await getCurrentUser();

  if (!user) {
    return { error: "Sessao expirada. Entre novamente para salvar." };
  }

  const accessError = await assertCanManageTenant(companyId);

  if (accessError) {
    return { error: accessError };
  }

  if (!title) {
    return { error: "Informe o titulo da landing page." };
  }

  try {
    await upsertLandingPage({
      companyId,
      createdBy: user.id,
      ctaLabel,
      heroImageFile,
      isPublished,
      sections: [
        { label: "Oferta 1", text: offerOne },
        { label: "Oferta 2", text: offerTwo },
        { label: "Oferta 3", text: offerThree },
      ].filter((section) => section.text),
      slug,
      subtitle: subtitle || null,
      templateKey: "ocean",
      title,
    });
  } catch (error) {
    return {
      error: `Nao foi possivel salvar a landing page. ${getReadableError(
        error,
      )}`,
    };
  }

  revalidatePath(`/site/${slug}`);
  revalidateTenantPages(slug);

  return {
    success: "Landing page salva.",
  };
}

export async function claimCompanyAsAdmin(
  _previousState: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const companyId = readText(formData, "companyId", "");
  const slug = readText(formData, "slug", "");
  const name = readText(formData, "name", "");

  if (!companyId || !slug) {
    return { error: "Nao foi possivel identificar o tenant." };
  }

  const user = await getCurrentUser();

  if (!user) {
    return { error: "Entre na sua conta para assumir este tenant." };
  }

  try {
    await ensureProfile({
      avatarUrl: user.user_metadata?.avatar_url as string | undefined,
      email: user.email,
      name: name || (user.user_metadata?.name as string | undefined) || "",
      userId: user.id,
    });
    await createMembership({
      companyId,
      role: "admin",
      userId: user.id,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";

    return {
      error: `Nao foi possivel assumir o tenant. ${message}`,
    };
  }

  revalidateTenantPages(slug);

  return {
    success: "Tenant assumido. Voce agora e admin.",
  };
}
