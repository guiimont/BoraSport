"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import {
  createCompanyInvitation,
  createMembership,
  createResource,
  createService,
  createSlot,
  createSlotsSkippingDuplicates,
  deleteMembership,
  ensureProfile,
  revokeCompanyInvitation,
  setBookingAttendance,
  setOperationalSessionTraining,
  updateBaseScheduleStatus,
  updateCompanyConfiguration,
  updateMembershipRole,
  updateResource,
  updateResourceOperationalStatus,
  upsertBaseSchedule,
  upsertLandingPage,
  upsertOperationalSession,
  upsertWeeklyWorkout,
} from "../../../lib/saas/mutations";
import { getCurrentUser, getUserCompanyRole } from "../../../lib/saas/queries";
import { getRequestOrigin } from "../../../lib/saas/auth-redirect";
import type {
  BaseScheduleStatus,
  DefaultSteererPolicy,
  OperationalSessionStatus,
  MembershipRole,
  VesselClass,
  VesselStatus,
  VocabularyConfig,
} from "../../../types/saas";

export type CompanyConfigurationState = {
  error?: string;
  success?: string;
};

export type AdminFormState = {
  error?: string;
  success?: string;
};

export type InvitationFormState = AdminFormState & {
  inviteLink?: string;
};

export type MembershipFormState = AdminFormState & {
  membershipId?: string;
};

export async function updateAttendanceAction(
  _previousState: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const companyId = readText(formData, "companyId", "");
  const sessionId = readText(formData, "sessionId", "");
  const bookingId = readText(formData, "bookingId", "");
  const slug = readText(formData, "slug", "");
  const status = readText(formData, "status", "");
  const permissionError = await assertCanManageTenant(companyId);

  if (permissionError) {
    return { error: permissionError };
  }

  if (!bookingId || !sessionId || !slug || (status !== "attended" && status !== "missed")) {
    return { error: "Não foi possível identificar a presença para atualizar." };
  }

  try {
    await setBookingAttendance({ bookingId, companyId, sessionId, status });
  } catch (error) {
    return {
      error: `Não foi possível registrar a presença. ${getReadableError(error)}`,
    };
  }

  revalidatePath(`/admin/${slug}/agenda/sessoes/${sessionId}`);
  revalidatePath("/perfil");

  return {
    success: status === "attended" ? "Presença registrada." : "Falta registrada.",
  };
}

const defaultVocabulary: Required<VocabularyConfig> = {
  booking_label: "Reserva",
  professional_label: "Instrutor",
  resource_label: "Canoa",
  service_label: "Serviço",
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

const knownVesselCapacities: Record<Exclude<VesselClass, "outro">, number> = {
  oc1: 1,
  oc4: 4,
  oc6: 6,
  v1: 1,
  v3: 3,
  v6: 6,
};

const vesselClasses = new Set<VesselClass>([
  "v1",
  "oc1",
  "v3",
  "oc4",
  "v6",
  "oc6",
  "outro",
]);

const vesselStatuses = new Set<VesselStatus>([
  "disponivel",
  "manutencao",
  "inativa",
]);

const steererPolicies = new Set<DefaultSteererPolicy>([
  "instrutor",
  "aluno",
  "definir_treino",
]);

const baseScheduleStatuses = new Set<BaseScheduleStatus>([
  "active",
  "inactive",
]);

const operationalSessionStatuses = new Set<OperationalSessionStatus>([
  "draft",
  "published",
  "cancelled",
]);

function readBaseScheduleStatus(formData: FormData): BaseScheduleStatus {
  const value = readText(formData, "status", "active");

  return baseScheduleStatuses.has(value as BaseScheduleStatus)
    ? (value as BaseScheduleStatus)
    : "active";
}

function readOperationalSessionStatus(formData: FormData): OperationalSessionStatus {
  const value = readText(formData, "status", "draft");

  return operationalSessionStatuses.has(value as OperationalSessionStatus)
    ? (value as OperationalSessionStatus)
    : "draft";
}

function readVesselClass(formData: FormData): VesselClass | null {
  const value = readOptionalText(formData, "vesselClass");

  if (!value || !vesselClasses.has(value as VesselClass)) {
    return null;
  }

  return value as VesselClass;
}

function readVesselStatus(formData: FormData): VesselStatus {
  const value = readText(formData, "vesselStatus", "disponivel");

  return vesselStatuses.has(value as VesselStatus)
    ? (value as VesselStatus)
    : "disponivel";
}

function resolveVesselCapacity(formData: FormData, vesselClass: VesselClass) {
  if (vesselClass !== "outro") {
    return knownVesselCapacities[vesselClass];
  }

  return Math.max(0, Math.floor(readNumber(formData, "capacityMaxima", 0)));
}

function readSteererPolicy(
  formData: FormData,
  vesselClass: VesselClass,
  capacityMaxima: number,
): DefaultSteererPolicy | null {
  if (vesselClass === "v1" || vesselClass === "oc1") {
    return null;
  }

  if (vesselClass === "outro" && capacityMaxima === 1) {
    return null;
  }

  const value = readText(formData, "defaultSteererPolicy", "definir_treino");

  return steererPolicies.has(value as DefaultSteererPolicy)
    ? (value as DefaultSteererPolicy)
    : "definir_treino";
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
    return "Sessão expirada. Entre novamente para salvar.";
  }

  const role = await getUserCompanyRole(companyId, user.id);

  if (role !== "admin" && role !== "professional") {
    return "Seu usuário ainda não tem permissão de gestão neste clube.";
  }

  return null;
}

async function assertCanAdminTenant(companyId: string) {
  const user = await getCurrentUser();

  if (!user) {
    return {
      error: "Sessão expirada. Entre novamente para salvar.",
      user: null,
    };
  }

  const role = await getUserCompanyRole(companyId, user.id);

  if (role !== "admin") {
    return {
      error: "Somente administradores podem gerenciar convites.",
      user: null,
    };
  }

  return {
    error: null,
    user,
  };
}

function getReadableError(error: unknown) {
  const message = error instanceof Error ? error.message : "Erro desconhecido";

  if (
    message.includes("row-level security") ||
    message.includes("permission denied")
  ) {
    return "Permissão negada. Confira se seu usuário tem acesso de gestão neste clube.";
  }

  if (message.includes("violates foreign key constraint")) {
    return "Dados relacionados não existem no banco. Confira se os cadastros pertencem ao mesmo clube.";
  }

  if (message.includes("Bucket not found")) {
    return "Bucket de arquivos não existe. Rode a migration de storage correspondente no Supabase.";
  }

  if (message.includes("base_schedule_resource_conflict")) {
    return "Essa canoa já está em outro horário recorrente que se sobrepõe no mesmo dia.";
  }

  if (message.includes("base_schedule_resource_unavailable")) {
    return "Uma das canoas selecionadas está em manutenção ou inativa.";
  }

  if (message.includes("base_schedule_coach_must_belong_to_company")) {
    return "O treinador precisa ser administrador ou treinador deste clube.";
  }

  if (message.includes("base_schedule_requires_resource")) {
    return "Selecione ao menos uma canoa.";
  }

  if (message.includes("operational_session_resource_conflict")) {
    return "Essa canoa já está em outra sessão que se sobrepõe nesta data.";
  }

  if (message.includes("operational_session_resource_unavailable")) {
    return "Uma das canoas selecionadas está em manutenção ou inativa.";
  }

  if (message.includes("operational_session_coach_must_belong_to_company")) {
    return "O treinador precisa ser administrador ou treinador deste clube.";
  }

  if (message.includes("operational_session_requires_resource")) {
    return "Selecione ao menos uma canoa.";
  }

  if (message.includes("operational_session_training_version_invalid")) {
    return "Selecione um treino publicado da biblioteca deste clube.";
  }

  if (message.includes("last_company_admin")) {
    return "O clube precisa manter pelo menos um administrador.";
  }

  if (message.includes("membership_not_found")) {
    return "Este vínculo não existe mais. Atualize a página.";
  }

  if (message.includes("membership_identity_immutable")) {
    return "A identidade do vínculo não pode ser alterada.";
  }

  return message;
}

export async function saveBaseSchedule(
  _previousState: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const coachId = readText(formData, "coachId", "");
  const companyId = readText(formData, "companyId", "");
  const durationMinutes = Math.floor(readNumber(formData, "durationMinutes", 60));
  const groupName = readText(formData, "groupName", "");
  const level = readOptionalText(formData, "level");
  const resourceIds = readTextList(formData, "resourceIds");
  const scheduleId = readOptionalText(formData, "scheduleId");
  const slug = readText(formData, "slug", "");
  const startTime = readText(formData, "startTime", "");
  const status = readBaseScheduleStatus(formData);
  const weekday = Math.floor(readNumber(formData, "weekday", 0));

  if (!companyId || !slug) {
    return { error: "Não foi possível identificar o clube." };
  }

  const access = await assertCanAdminTenant(companyId);

  if (access.error || !access.user) {
    return { error: access.error || "Permissão negada." };
  }

  if (weekday < 1 || weekday > 7) {
    return { error: "Escolha um dia da semana." };
  }

  if (!startTime) {
    return { error: "Informe o horário inicial." };
  }

  if (durationMinutes < 5 || durationMinutes > 360) {
    return { error: "Informe uma duração entre 5 e 360 minutos." };
  }

  if (!groupName) {
    return { error: "Informe o nome da turma." };
  }

  if (!coachId) {
    return { error: "Selecione o treinador responsável." };
  }

  if (resourceIds.length === 0) {
    return { error: "Selecione ao menos uma canoa." };
  }

  try {
    const savedScheduleId = await upsertBaseSchedule({
      coachId,
      companyId,
      createdBy: access.user.id,
      durationMinutes,
      groupName,
      level,
      resourceIds,
      scheduleId,
      startTime,
      status,
      weekday,
    });

    revalidatePath(`/admin/${slug}`);
    revalidatePath(`/admin/${slug}/agenda`);
    revalidatePath(`/admin/${slug}/agenda/grade`);
    revalidatePath(`/admin/${slug}/agenda/grade/${savedScheduleId}`);
  } catch (error) {
    return {
      error: `Não foi possível salvar o horário. ${getReadableError(error)}`,
    };
  }

  return {
    success: scheduleId ? "Horário atualizado." : "Horário da grade criado.",
  };
}

export async function changeBaseScheduleStatus(
  _previousState: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const companyId = readText(formData, "companyId", "");
  const scheduleId = readText(formData, "scheduleId", "");
  const slug = readText(formData, "slug", "");
  const status = readBaseScheduleStatus(formData);

  if (!companyId || !scheduleId || !slug) {
    return { error: "Não foi possível identificar o horário." };
  }

  const access = await assertCanAdminTenant(companyId);

  if (access.error) {
    return { error: access.error };
  }

  try {
    await updateBaseScheduleStatus({
      companyId,
      scheduleId,
      status,
    });
  } catch (error) {
    return {
      error: `Não foi possível atualizar. ${getReadableError(error)}`,
    };
  }

  revalidatePath(`/admin/${slug}/agenda`);
  revalidatePath(`/admin/${slug}/agenda/grade`);
  revalidatePath(`/admin/${slug}/agenda/grade/${scheduleId}`);

  return {
    success: status === "active" ? "Horário reativado." : "Horário inativado.",
  };
}

export async function saveOperationalSchedule(
  _previousState: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const companyId = readText(formData, "companyId", "");
  const baseScheduleId = readOptionalText(formData, "baseScheduleId");
  const slug = readText(formData, "slug", "");
  const recurrenceMode = readText(formData, "recurrenceMode", "single");
  const sessionDate = readText(formData, "sessionDate", "");
  const startTime = readText(formData, "startTime", "");
  const durationMinutes = Math.floor(readNumber(formData, "durationMinutes", 60));
  const groupName = readText(formData, "groupName", "");
  const level = readOptionalText(formData, "level");
  const coachId = readText(formData, "coachId", "");
  const resourceIds = readTextList(formData, "resourceIds");
  const status = readOperationalSessionStatus(formData);
  const trainingPlanVersionId = readOptionalText(formData, "trainingPlanVersionId");

  if (!companyId || !slug) {
    return { error: "Não foi possível identificar o clube." };
  }

  const access = await assertCanAdminTenant(companyId);

  if (access.error || !access.user) {
    return { error: access.error || "Permissão negada." };
  }

  if (!sessionDate) {
    return { error: "Informe a data do horário." };
  }

  if (!startTime) {
    return { error: "Informe o horário inicial." };
  }

  if (durationMinutes < 5 || durationMinutes > 360) {
    return { error: "Informe uma duração entre 5 e 360 minutos." };
  }

  if (!groupName) {
    return { error: "Informe o nome da turma." };
  }

  if (!coachId) {
    return { error: "Selecione o treinador responsável." };
  }

  if (resourceIds.length === 0) {
    return { error: "Selecione ao menos uma canoa." };
  }

  try {
    if (recurrenceMode === "weekly") {
      const date = new Date(`${sessionDate}T12:00:00-03:00`);
      const weekday = date.getDay() === 0 ? 7 : date.getDay();
      const savedScheduleId = await upsertBaseSchedule({
        coachId,
        companyId,
        createdBy: access.user.id,
        durationMinutes,
        groupName,
        level,
        resourceIds,
        startTime,
        status: status === "cancelled" ? "inactive" : "active",
        weekday,
      });

      if (trainingPlanVersionId) {
        await upsertOperationalSession({
          baseScheduleId: savedScheduleId,
          coachId,
          companyId,
          durationMinutes,
          groupName,
          level,
          resourceIds,
          sessionDate,
          startTime,
          status,
          trainingPlanVersionId,
        });
      }
    } else {
      await upsertOperationalSession({
        baseScheduleId,
        coachId,
        companyId,
        durationMinutes,
        groupName,
        level,
        resourceIds,
        sessionDate,
        startTime,
        status,
        trainingPlanVersionId,
      });
    }

    revalidatePath(`/admin/${slug}`);
    revalidatePath(`/admin/${slug}/agenda`);
    revalidatePath(`/clube/${slug}`);
  } catch (error) {
    return {
      error: `Não foi possível salvar o horário. ${getReadableError(error)}`,
    };
  }

  return {
    success:
      recurrenceMode === "weekly"
        ? "Horário recorrente criado na Agenda."
        : "Sessão criada na Agenda.",
  };
}

export async function linkOperationalSessionTraining(
  _previousState: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const companyId = readText(formData, "companyId", "");
  const sessionId = readText(formData, "sessionId", "");
  const slug = readText(formData, "slug", "");
  const trainingPlanVersionId = readOptionalText(formData, "trainingPlanVersionId");

  if (!companyId || !sessionId || !slug) {
    return { error: "Não foi possível identificar a sessão." };
  }

  const access = await assertCanAdminTenant(companyId);

  if (access.error) {
    return { error: access.error };
  }

  try {
    await setOperationalSessionTraining({
      sessionId,
      trainingPlanVersionId,
    });
  } catch (error) {
    return {
      error: `Não foi possível atualizar o treino. ${getReadableError(error)}`,
    };
  }

  revalidatePath(`/admin/${slug}/agenda`);
  revalidatePath(`/admin/${slug}/agenda/sessoes/${sessionId}`);

  return {
    success: trainingPlanVersionId
      ? "Treino vinculado à sessão."
      : "Treino removido da sessão.",
  };
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
      error: "Não foi possível identificar o clube para salvar.",
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
      error: `Não foi possível salvar. ${getReadableError(error)}`,
    };
  }

  revalidateTenantPages(slug);

  return {
    success: "Configuração salva.",
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
  const vesselClass = readVesselClass(formData);
  const vesselStatus = readVesselStatus(formData);
  const capacityMaxima = vesselClass
    ? resolveVesselCapacity(formData, vesselClass)
    : Math.max(1, Math.floor(readNumber(formData, "capacityMaxima", 1)));
  const defaultSteererPolicy = vesselClass
    ? readSteererPolicy(formData, vesselClass, capacityMaxima)
    : null;
  const internalCode = readOptionalText(formData, "internalCode");
  const operationalNotes = readOptionalText(formData, "operationalNotes");

  if (!companyId || !slug) {
    return { error: "Não foi possível identificar o clube." };
  }

  const access = await assertCanAdminTenant(companyId);

  if (access.error) {
    return { error: access.error };
  }

  if (!name) {
    return { error: `Informe o nome do ${resourceLabel.toLowerCase()}.` };
  }

  if (!vesselClass) {
    return { error: "Escolha a classe da canoa." };
  }

  if (capacityMaxima < 1) {
    return { error: "Informe uma capacidade valida para a canoa." };
  }

  try {
    await createResource({
      capacityMaxima,
      companyId,
      defaultSteererPolicy,
      internalCode,
      name,
      operationalNotes,
      vesselClass,
      vesselStatus,
    });
  } catch (error) {
    return {
      error: `Não foi possível cadastrar. ${getReadableError(error)}`,
    };
  }

  revalidateTenantPages(slug);

  return {
    success: `${resourceLabel} cadastrado.`,
  };
}

export async function saveResourceOperation(
  _previousState: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const companyId = readText(formData, "companyId", "");
  const resourceId = readText(formData, "resourceId", "");
  const slug = readText(formData, "slug", "");
  const resourceLabel = readText(formData, "resourceLabel", "Canoa");
  const name = readText(formData, "name", "");
  const vesselClass = readVesselClass(formData);
  const vesselStatus = readVesselStatus(formData);
  const capacityMaxima = vesselClass
    ? resolveVesselCapacity(formData, vesselClass)
    : Math.max(1, Math.floor(readNumber(formData, "capacityMaxima", 1)));
  const defaultSteererPolicy = vesselClass
    ? readSteererPolicy(formData, vesselClass, capacityMaxima)
    : null;
  const internalCode = readOptionalText(formData, "internalCode");
  const operationalNotes = readOptionalText(formData, "operationalNotes");

  if (!companyId || !resourceId || !slug) {
    return { error: "Não foi possível identificar a canoa." };
  }

  const access = await assertCanAdminTenant(companyId);

  if (access.error) {
    return { error: access.error };
  }

  if (!name) {
    return { error: `Informe o nome do ${resourceLabel.toLowerCase()}.` };
  }

  if (!vesselClass) {
    return { error: "Escolha a classe da canoa." };
  }

  if (capacityMaxima < 1) {
    return { error: "Informe uma capacidade valida para a canoa." };
  }

  try {
    await updateResource({
      capacityMaxima,
      companyId,
      defaultSteererPolicy,
      internalCode,
      name,
      operationalNotes,
      resourceId,
      vesselClass,
      vesselStatus,
    });
  } catch (error) {
    return {
      error: `Não foi possível salvar. ${getReadableError(error)}`,
    };
  }

  revalidateTenantPages(slug);
  revalidatePath(`/admin/${slug}/canoas`);

  return {
    success: `${resourceLabel} atualizado.`,
  };
}

export async function updateResourceStatusAction(
  _previousState: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const companyId = readText(formData, "companyId", "");
  const resourceId = readText(formData, "resourceId", "");
  const slug = readText(formData, "slug", "");
  const vesselStatus = readVesselStatus(formData);

  if (!companyId || !resourceId || !slug) {
    return { error: "Não foi possível identificar a canoa." };
  }

  const access = await assertCanAdminTenant(companyId);

  if (access.error) {
    return { error: access.error };
  }

  try {
    await updateResourceOperationalStatus({
      companyId,
      resourceId,
      vesselStatus,
    });
  } catch (error) {
    return {
      error: `Não foi possível atualizar a situação. ${getReadableError(error)}`,
    };
  }

  revalidateTenantPages(slug);
  revalidatePath(`/admin/${slug}/canoas`);

  return {
    success: "Situação da canoa atualizada.",
  };
}

export async function saveService(
  _previousState: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const companyId = readText(formData, "companyId", "");
  const slug = readText(formData, "slug", "");
  const serviceLabel = readText(formData, "serviceLabel", "Serviço");
  const name = readText(formData, "name", "");
  const description = readText(formData, "description", "");
  const durationMinutes = Math.max(
    5,
    Math.floor(readNumber(formData, "durationMinutes", 50)),
  );
  const price = Math.max(0, readNumber(formData, "price", 0));

  if (!companyId || !slug) {
    return { error: "Não foi possível identificar o clube." };
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
      error: `Não foi possível cadastrar. ${getReadableError(error)}`,
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
  const serviceLabel = readText(formData, "serviceLabel", "Serviço");
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
    return { error: "Não foi possível identificar o clube." };
  }

  const accessError = await assertCanManageTenant(companyId);

  if (accessError) {
    return { error: accessError };
  }

  if (!serviceId) {
    return { error: `Selecione um ${serviceLabel.toLowerCase()}.` };
  }

  if (!date || !time) {
    return { error: "Informe data e horário." };
  }

  if (!resourceId) {
    return { error: `Selecione um ${resourceLabel.toLowerCase()}.` };
  }

  const startDate = new Date(`${date}T${time}:00-03:00`);

  if (Number.isNaN(startDate.getTime())) {
    return { error: "Data ou horário inválido." };
  }

  if (startDate.getTime() <= Date.now()) {
    return {
      error:
        "Esse horário já passou. Publique um horário futuro para aparecer na página pública.",
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
      error: `Não foi possível publicar o horário. ${getReadableError(error)}`,
    };
  }

  revalidateTenantPages(slug);

  return {
    success: "Horário publicado.",
  };
}

export async function saveWeeklySlots(
  _previousState: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const companyId = readText(formData, "companyId", "");
  const slug = readText(formData, "slug", "");
  const serviceLabel = readText(formData, "serviceLabel", "Serviço");
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
    return { error: "Não foi possível identificar o clube." };
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
    return { error: "Informe o período da grade semanal." };
  }

  if (times.length === 0) {
    return { error: "Informe pelo menos um horário da grade semanal." };
  }

  const selectedWeekdays = weekdays.length > 0 ? weekdays : [1, 2, 3, 4, 5];
  const rangeStart = new Date(`${dateStart}T12:00:00-03:00`);
  const rangeEnd = new Date(`${dateEnd}T12:00:00-03:00`);

  if (
    Number.isNaN(rangeStart.getTime()) ||
    Number.isNaN(rangeEnd.getTime()) ||
    rangeEnd.getTime() < rangeStart.getTime()
  ) {
    return { error: "Período inválido." };
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
        "Nenhum horário futuro encontrado nesse período. Ajuste as datas ou horários.",
    };
  }

  if (slotsToCreate.length > 80) {
    return {
      error:
        "A grade geraria horários demais de uma vez. Reduza o período ou a quantidade de horários.",
    };
  }

  try {
    const createdSlots = await createSlotsSkippingDuplicates(slotsToCreate);
    revalidateTenantPages(slug);

    if (createdSlots.length === 0) {
      return {
        success:
          "A grade já estava publicada. Nenhum horário duplicado foi criado.",
      };
    }

    return {
      success: `${createdSlots.length} horário${
        createdSlots.length === 1 ? "" : "s"
      } publicado${createdSlots.length === 1 ? "" : "s"} na agenda pública.`,
    };
  } catch (error) {
    return {
      error: `Não foi possível publicar a grade semanal. ${getReadableError(
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
    return { error: "Não foi possível identificar o clube." };
  }

  const user = await getCurrentUser();

  if (!user) {
    return { error: "Sessão expirada. Entre novamente para salvar." };
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
      error: `Não foi possível salvar o treino da semana. ${getReadableError(
        error,
      )}`,
    };
  }

  revalidateTenantPages(slug);

  return {
    success: "Treino da semana publicado para os remadores.",
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
    return { error: "Não foi possível identificar o clube." };
  }

  const user = await getCurrentUser();

  if (!user) {
    return { error: "Sessão expirada. Entre novamente para salvar." };
  }

  const accessError = await assertCanManageTenant(companyId);

  if (accessError) {
    return { error: accessError };
  }

  if (!title) {
    return { error: "Informe o título da landing page." };
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
      error: `Não foi possível salvar a landing page. ${getReadableError(
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
    return { error: "Não foi possível identificar o clube." };
  }

  const user = await getCurrentUser();

  if (!user) {
    return { error: "Entre na sua conta para assumir este clube." };
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
      error: `Não foi possível assumir o clube. ${message}`,
    };
  }

  revalidateTenantPages(slug);

  return {
    success: "Clube assumido. Você agora é administrador.",
  };
}

export async function createClientInvitation(
  _previousState: InvitationFormState,
  formData: FormData,
): Promise<InvitationFormState> {
  const companyId = readText(formData, "companyId", "");
  const slug = readText(formData, "slug", "");
  const expiresInDays = Math.min(
    30,
    Math.max(1, Math.floor(readNumber(formData, "expiresInDays", 7))),
  );

  if (!companyId || !slug) {
    return { error: "Não foi possível identificar o clube." };
  }

  const access = await assertCanAdminTenant(companyId);

  if (access.error || !access.user) {
    return { error: access.error || "Permissão negada." };
  }

  const expiresAt = new Date(
    Date.now() + expiresInDays * 24 * 60 * 60 * 1000,
  ).toISOString();

  try {
    const { rawToken } = await createCompanyInvitation({
      companyId,
      createdBy: access.user.id,
      expiresAt,
    });
    const headerStore = await headers();
    const origin = getRequestOrigin(headerStore);
    const inviteLink = `${origin}/convite#token=${rawToken}`;

    revalidateTenantPages(slug);

    return {
      inviteLink,
      success:
        "Convite criado. Copie o link agora; ele não será exibido novamente.",
    };
  } catch (error) {
    return {
      error: `Não foi possível gerar o convite. ${getReadableError(error)}`,
    };
  }
}

export async function revokeClientInvitation(
  _previousState: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const companyId = readText(formData, "companyId", "");
  const slug = readText(formData, "slug", "");
  const invitationId = readText(formData, "invitationId", "");

  if (!companyId || !slug || !invitationId) {
    return { error: "Não foi possível identificar o convite." };
  }

  const access = await assertCanAdminTenant(companyId);

  if (access.error) {
    return { error: access.error };
  }

  try {
    await revokeCompanyInvitation(invitationId);
    revalidateTenantPages(slug);

    return { success: "Convite revogado." };
  } catch (error) {
    return {
      error: `Não foi possível revogar. ${getReadableError(error)}`,
    };
  }
}

export async function updateMemberRoleAction(
  _previousState: MembershipFormState,
  formData: FormData,
): Promise<MembershipFormState> {
  const companyId = readText(formData, "companyId", "");
  const membershipId = readText(formData, "membershipId", "");
  const slug = readText(formData, "slug", "");
  const role = readText(formData, "role", "") as MembershipRole;

  if (!companyId || !membershipId || !slug) {
    return { error: "Não foi possível identificar o vínculo.", membershipId };
  }

  if (role !== "admin" && role !== "professional" && role !== "client") {
    return { error: "Selecione uma função válida.", membershipId };
  }

  const access = await assertCanAdminTenant(companyId);

  if (access.error) {
    return { error: access.error, membershipId };
  }

  try {
    await updateMembershipRole({ companyId, membershipId, role });
    revalidatePath(`/admin/${slug}/remadores`);
    revalidatePath(`/admin/${slug}`);

    return { membershipId, success: "Função atualizada." };
  } catch (error) {
    return {
      error: `Não foi possível atualizar a função. ${getReadableError(error)}`,
      membershipId,
    };
  }
}

export async function removeMemberAction(
  _previousState: MembershipFormState,
  formData: FormData,
): Promise<MembershipFormState> {
  const companyId = readText(formData, "companyId", "");
  const membershipId = readText(formData, "membershipId", "");
  const slug = readText(formData, "slug", "");

  if (!companyId || !membershipId || !slug) {
    return { error: "Não foi possível identificar o vínculo.", membershipId };
  }

  const access = await assertCanAdminTenant(companyId);

  if (access.error) {
    return { error: access.error, membershipId };
  }

  try {
    await deleteMembership({ companyId, membershipId });
    revalidatePath(`/admin/${slug}/remadores`);
    revalidatePath(`/admin/${slug}`);

    return { membershipId, success: "Vínculo removido do clube." };
  } catch (error) {
    return {
      error: `Não foi possível remover o vínculo. ${getReadableError(error)}`,
      membershipId,
    };
  }
}
