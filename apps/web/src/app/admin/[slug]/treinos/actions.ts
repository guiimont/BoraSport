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
  BoraZone,
  TrainingBlockInput,
  TrainingBlockKind,
  TrainingBlockType,
  TrainingTargetType,
  TrainingVersionLevel,
  VesselClass,
} from "../../../../types/saas";
import { getManageAdminContext } from "../admin-context";

export type TrainingBuilderState = {
  error?: string;
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

const versionLevels = new Set<TrainingVersionLevel>([
  "iniciante",
  "intermediario",
  "avancado",
  "competicao",
  "personalizado",
]);

const blockKinds = new Set<TrainingBlockKind>(["simple", "repeat_group"]);
const blockTypes = new Set<TrainingBlockType>([
  "aquecimento",
  "tecnica",
  "base",
  "ritmo",
  "forte",
  "largada",
  "recuperacao",
  "descanso_hidratacao",
  "volta_calma",
]);
const boraZones = new Set<BoraZone>([
  "z1_recuperar",
  "z2_base",
  "z3_ritmo",
  "z4_forte",
  "z5_maximo",
]);

function readText(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

function readOptionalText(formData: FormData, key: string) {
  const value = readText(formData, key);

  return value || null;
}

function readPositiveMinutes(formData: FormData, key: string) {
  const value = Number(readText(formData, key));

  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }

  return Math.round(value * 60);
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
    return "Adicione ao menos um bloco simples antes de publicar.";
  }

  if (message.includes("repeat") || message.includes("group")) {
    return "Revise os grupos de repetição. Grupo dentro de grupo não é permitido.";
  }

  return "Não foi possível salvar o treino estruturado.";
}

function normalizeBlocks(rawBlocks: unknown): TrainingBlockInput[] {
  if (!Array.isArray(rawBlocks)) {
    return [];
  }

  return rawBlocks
    .map((rawBlock, index) => {
      if (!rawBlock || typeof rawBlock !== "object") {
        return null;
      }

      const block = rawBlock as Record<string, unknown>;
      const blockKind =
        typeof block.block_kind === "string" &&
        blockKinds.has(block.block_kind as TrainingBlockKind)
          ? (block.block_kind as TrainingBlockKind)
          : "simple";
      const blockType =
        typeof block.block_type === "string" &&
        blockTypes.has(block.block_type as TrainingBlockType)
          ? (block.block_type as TrainingBlockType)
          : null;
      const boraZone =
        typeof block.bora_zone === "string" &&
        boraZones.has(block.bora_zone as BoraZone)
          ? (block.bora_zone as BoraZone)
          : null;
      const durationMinutes = Number(block.duration_minutes);
      const repeatCount = Number(block.repeat_count);
      const name =
        typeof block.name === "string" && block.name.trim()
          ? block.name.trim()
          : blockKind === "repeat_group"
            ? "Repetição"
            : "Bloco";

      return {
        block_kind: blockKind,
        block_type: blockKind === "simple" ? blockType : null,
        bora_zone: blockKind === "simple" ? boraZone : null,
        client_key:
          typeof block.client_key === "string" ? block.client_key : undefined,
        duration_seconds:
          blockKind === "simple" && Number.isFinite(durationMinutes)
            ? Math.max(1, Math.round(durationMinutes * 60))
            : null,
        instruction:
          typeof block.instruction === "string" && block.instruction.trim()
            ? block.instruction.trim()
            : null,
        name,
        parent_client_key:
          typeof block.parent_client_key === "string" && block.parent_client_key
            ? block.parent_client_key
            : null,
        repeat_count:
          blockKind === "repeat_group" && Number.isFinite(repeatCount)
            ? Math.max(2, Math.min(20, Math.floor(repeatCount)))
            : null,
        sort_order: Number.isFinite(Number(block.sort_order))
          ? Number(block.sort_order)
          : index + 1,
        target_type: "time" as TrainingTargetType,
      };
    })
    .filter(Boolean) as TrainingBlockInput[];
}

export async function createStructuredTrainingPlan(
  _previousState: TrainingBuilderState,
  formData: FormData,
): Promise<TrainingBuilderState> {
  const slug = readText(formData, "slug");
  const title = readText(formData, "title");
  const rawVesselClass = readText(formData, "vesselClass");
  const rawLevel = readText(formData, "level");
  const intent = readText(formData, "intent");
  const blocksJson = readText(formData, "blocksJson");

  if (!slug || !title) {
    return {
      error: "Informe o nome do treino.",
    };
  }

  let parsedBlocks: unknown = [];

  try {
    parsedBlocks = blocksJson ? JSON.parse(blocksJson) : [];
  } catch {
    return {
      error: "Não foi possível ler a estrutura de blocos.",
    };
  }

  const blocks = normalizeBlocks(parsedBlocks);

  if (blocks.length === 0) {
    return {
      error: "Adicione ao menos um bloco ao treino.",
    };
  }

  let createdTrainingPlanId: string | null = null;

  try {
    const context = await getManageAdminContext(slug);
    const vesselClass = vesselClasses.has(rawVesselClass as VesselClass)
      ? (rawVesselClass as VesselClass)
      : "outro";
    const level = versionLevels.has(rawLevel as TrainingVersionLevel)
      ? (rawLevel as TrainingVersionLevel)
      : "intermediario";
    const durationSeconds = readPositiveMinutes(formData, "durationMinutes");

    const trainingPlanId = await createTrainingPlanDraft({
      companyId: context.company.id,
      defaultDurationSeconds: durationSeconds,
      objective: readOptionalText(formData, "objective"),
      title,
      vesselClass,
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
