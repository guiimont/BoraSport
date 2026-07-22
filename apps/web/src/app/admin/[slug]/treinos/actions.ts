"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  archiveTrainingPlan,
  createTrainingPlanDraft,
  createTrainingPlanVersion,
  publishTrainingPlanVersion,
  saveTrainingBlocks,
} from "../../../../lib/saas/mutations";
import type {
  TrainingMode,
  TrainingVersionLevel,
} from "../../../../types/saas";
import { getManageAdminContext } from "../admin-context";
import {
  calculateTrainingSummary,
  toTrainingBlockPayload,
  type TrainingPhase,
} from "./training-builder-model";

export type TrainingBuilderState = {
  error?: string;
};

const trainingModes = new Set<TrainingMode>(["individual", "coletivo"]);

const versionLevels = new Set<TrainingVersionLevel>([
  "iniciante",
  "intermediario",
  "avancado",
  "competicao",
  "personalizado",
]);

function readText(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

function readOptionalText(formData: FormData, key: string) {
  const value = readText(formData, key);

  return value || null;
}

function getReadableTrainingError(error: unknown) {
  const message = error instanceof Error ? error.message : "Erro desconhecido";

  if (message.includes("permission")) {
    return "Você não tem permissão para alterar este treino.";
  }

  if (message.includes("published") || message.includes("locked")) {
    return "Versões publicadas não podem ser alteradas.";
  }

  if (message.includes("training_version_without_blocks")) {
    return "Adicione ao menos uma etapa antes de publicar.";
  }

  if (message.includes("repeat") || message.includes("group")) {
    return "Revise as séries. Série dentro de série não é permitido.";
  }

  return "Não foi possível salvar o treino estruturado.";
}

function normalizePhases(rawPhases: unknown): TrainingPhase[] {
  if (!Array.isArray(rawPhases)) {
    return [];
  }

  return rawPhases
    .map((rawPhase) => {
      if (!rawPhase || typeof rawPhase !== "object") {
        return null;
      }

      const phase = rawPhase as TrainingPhase;

      return phase;
    })
    .filter(Boolean) as TrainingPhase[];
}

export async function createStructuredTrainingPlan(
  _previousState: TrainingBuilderState,
  formData: FormData,
): Promise<TrainingBuilderState> {
  const slug = readText(formData, "slug");
  const title = readText(formData, "title");
  const rawTrainingMode = readText(formData, "trainingMode");
  const rawLevel = readText(formData, "level");
  const intent = readText(formData, "intent");
  const phasesJson = readText(formData, "phasesJson");

  if (!slug || !title) {
    return {
      error: "Informe o nome do treino.",
    };
  }

  let parsedPhases: unknown = [];

  try {
    parsedPhases = phasesJson ? JSON.parse(phasesJson) : [];
  } catch {
    return {
      error: "Não foi possível ler a estrutura do treino.",
    };
  }

  const phases = normalizePhases(parsedPhases);
  const summary = calculateTrainingSummary(phases);

  if (phases.length === 0 || summary.validationErrors.length > 0) {
    return {
      error: summary.validationErrors[0] || "Adicione ao menos uma etapa ao treino.",
    };
  }

  const blocks = toTrainingBlockPayload(phases);
  let createdTrainingPlanId: string | null = null;

  try {
    const context = await getManageAdminContext(slug);
    const trainingMode = trainingModes.has(rawTrainingMode as TrainingMode)
      ? (rawTrainingMode as TrainingMode)
      : "coletivo";
    const level = versionLevels.has(rawLevel as TrainingVersionLevel)
      ? (rawLevel as TrainingVersionLevel)
      : "intermediario";
    const durationSeconds = Math.round(summary.totalMinutes * 60);

    const trainingPlanId = await createTrainingPlanDraft({
      companyId: context.company.id,
      defaultDurationSeconds: durationSeconds,
      objective: readOptionalText(formData, "objective"),
      title,
      trainingMode,
    });
    const trainingPlanVersionId = await createTrainingPlanVersion({
      durationSeconds,
      level,
      safetyNotes: readOptionalText(formData, "safetyNotes"),
      technicalNotes: readOptionalText(formData, "technicalNotes"),
      trainingPlanId,
    });

    await saveTrainingBlocks({
      blocks,
      trainingPlanVersionId,
    });

    if (intent === "publish") {
      await publishTrainingPlanVersion(trainingPlanVersionId);
    }

    createdTrainingPlanId = trainingPlanId;
    revalidatePath(`/admin/${slug}/treinos`);
    revalidatePath(`/admin/${slug}/treinos/${trainingPlanId}`);
  } catch (error) {
    return {
      error: getReadableTrainingError(error),
    };
  }

  redirect(`/admin/${slug}/treinos/${createdTrainingPlanId}`);
}

export async function publishTrainingVersionAction(formData: FormData) {
  const slug = readText(formData, "slug");
  const trainingPlanId = readText(formData, "trainingPlanId");
  const trainingPlanVersionId = readText(formData, "trainingPlanVersionId");

  await publishTrainingPlanVersion(trainingPlanVersionId);
  revalidatePath(`/admin/${slug}/treinos`);
  revalidatePath(`/admin/${slug}/treinos/${trainingPlanId}`);
  redirect(`/admin/${slug}/treinos/${trainingPlanId}`);
}

export async function archiveTrainingPlanAction(formData: FormData) {
  const slug = readText(formData, "slug");
  const trainingPlanId = readText(formData, "trainingPlanId");

  await archiveTrainingPlan(trainingPlanId);
  revalidatePath(`/admin/${slug}/treinos`);
  revalidatePath(`/admin/${slug}/treinos/${trainingPlanId}`);
  redirect(`/admin/${slug}/treinos`);
}
