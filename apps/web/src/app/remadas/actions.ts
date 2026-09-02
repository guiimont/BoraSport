"use server";

import { revalidatePath } from "next/cache";

import { importActivityFile } from "../../lib/saas/activity-import";
import { getCurrentUser } from "../../lib/saas/queries";
import { createClient } from "../../lib/saas/supabase-server";

export type ActivityFormState = { error?: string; success?: string };
export type ActivityMatchState = { error?: string; success?: string };
export type ActivityFeedbackState = { error?: string; success?: string };

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function optionalPositiveNumber(formData: FormData, key: string) {
  const raw = text(formData, key).replace(",", ".");
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : Number.NaN;
}

function localDateTimeToIso(value: string) {
  if (!value) return null;
  const date = new Date(`${value}:00-03:00`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export async function saveActivity(
  _state: ActivityFormState,
  formData: FormData,
): Promise<ActivityFormState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Entre na sua conta antes de registrar uma remada." };

  const fileValue = formData.get("activityFile");
  const file = fileValue instanceof File && fileValue.size ? fileValue : null;
  const companyId = text(formData, "companyId") || null;
  const requestedVisibility = text(formData, "visibility");
  const visibility =
    companyId && requestedVisibility === "organization"
      ? "organization"
      : "private";
  const customTitle = text(formData, "title");

  try {
    const imported = file ? await importActivityFile(file) : null;
    const startedAt = imported?.startedAt ?? localDateTimeToIso(text(formData, "startedAt"));
    const distanceKm = optionalPositiveNumber(formData, "distanceKm");
    const durationMinutes = optionalPositiveNumber(formData, "durationMinutes");

    if (!imported && !startedAt) {
      return { error: "Informe quando a remada aconteceu ou envie um arquivo." };
    }
    if (Number.isNaN(distanceKm) || Number.isNaN(durationMinutes)) {
      return { error: "Distância e duração precisam ser números válidos." };
    }

    const supabase = await createClient();
    const { error } = await supabase.from("activity_records").insert({
      activity_type: imported?.activityType ?? "paddling",
      average_heart_rate: imported?.averageHeartRate ?? null,
      average_speed: imported?.averageSpeed ?? null,
      calories: imported?.calories ?? null,
      company_id: companyId,
      distance_meters: imported?.distanceMeters ?? (distanceKm !== null ? distanceKm * 1000 : null),
      duration_seconds: imported?.durationSeconds ?? (durationMinutes !== null ? Math.round(durationMinutes * 60) : null),
      elevation_gain_meters: imported?.elevationGainMeters ?? null,
      external_id: imported?.externalId ?? null,
      max_heart_rate: imported?.maxHeartRate ?? null,
      max_speed: imported?.maxSpeed ?? null,
      metrics: {},
      provider: imported?.provider ?? "manual",
      source_payload: imported?.sourcePayload ?? null,
      started_at: startedAt,
      title: customTitle || imported?.title || "Remada",
      user_id: user.id,
      visibility,
    });

    if (error) {
      if (error.code === "23505") {
        return { error: "Essa atividade já foi importada anteriormente." };
      }
      throw error;
    }

    revalidatePath("/remadas");
    revalidatePath("/perfil");
    return {
      success: imported
        ? "Arquivo importado. Confira sua nova remada no histórico."
        : "Remada registrada no seu histórico.",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/row-level security|policy|permission/i.test(message)) {
      return { error: "A fundação de atividades ainda não foi aplicada no Supabase ou você não possui acesso à organização selecionada." };
    }
    return { error: `Não foi possível registrar a remada. ${message}` };
  }
}

export async function linkActivityToSession(
  _state: ActivityMatchState,
  formData: FormData,
): Promise<ActivityMatchState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Entre na sua conta para vincular a atividade." };

  const activityId = text(formData, "activityId");
  const sessionId = text(formData, "sessionId");
  if (!activityId || !sessionId) {
    return { error: "Escolha uma sessão publicada para validar a presença." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("link_activity_to_session", {
    p_activity_id: activityId,
    p_session_id: sessionId,
  });

  if (error) return { error: `Não foi possível vincular. ${error.message}` };

  revalidatePath("/remadas");
  revalidatePath("/perfil");
  return {
    success:
      "Taho‘e! Remando como um só. Sua atividade foi vinculada à sessão do clube com presença validada.",
  };
}

export async function saveActivityFeedback(
  _state: ActivityFeedbackState,
  formData: FormData,
): Promise<ActivityFeedbackState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Entre na sua conta para enviar o retorno." };

  const activityId = text(formData, "activityId");
  const rpe = Number(text(formData, "rpe"));
  const feeling = text(formData, "feeling");
  const notes = text(formData, "notes");
  const allowedFeelings = ["great", "good", "neutral", "tired", "exhausted"];

  if (!activityId || !Number.isInteger(rpe) || rpe < 1 || rpe > 10 || !allowedFeelings.includes(feeling)) {
    return { error: "Informe o esforço e como você terminou a remada." };
  }
  if (notes.length > 600) return { error: "A observação pode ter até 600 caracteres." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("activity_records")
    .update({
      athlete_feedback_at: new Date().toISOString(),
      athlete_feeling: feeling,
      athlete_notes: notes || null,
      athlete_pain: formData.get("pain") === "on",
      athlete_rpe: rpe,
    })
    .eq("id", activityId)
    .eq("user_id", user.id);

  if (error) return { error: `Não foi possível salvar o retorno. ${error.message}` };

  revalidatePath("/remadas");
  return { success: "Retorno salvo. O treinador poderá acompanhar esta remada quando ela estiver vinculada ao clube." };
}
