import type {
  BoraZone,
  TrainingBlockInput,
  TrainingBlockType,
} from "../../../../types/saas";

export type TrainingStepPhase = {
  boraZone: BoraZone;
  blockType: TrainingBlockType;
  durationMinutes: number;
  id: string;
  instruction: string;
  kind: "step";
  name: string;
};

export type TrainingSeriesPhase = {
  id: string;
  kind: "series";
  name: string;
  repeatCount: number;
  steps: TrainingStepPhase[];
};

export type TrainingPhase = TrainingSeriesPhase | TrainingStepPhase;

export type TrainingSummary = {
  mainPhasesCount: number;
  totalMinutes: number;
  validationErrors: string[];
  zoneMinutes: Record<BoraZone, number>;
};

export const emptyZoneMinutes: Record<BoraZone, number> = {
  z1_recuperar: 0,
  z2_base: 0,
  z3_ritmo: 0,
  z4_forte: 0,
  z5_maximo: 0,
};

export function calculateStepDuration(step: TrainingStepPhase) {
  return Number.isFinite(step.durationMinutes)
    ? Math.max(0, step.durationMinutes)
    : 0;
}

export function calculateSeriesCycleDuration(series: TrainingSeriesPhase) {
  return series.steps.reduce(
    (total, step) => total + calculateStepDuration(step),
    0,
  );
}

export function calculateSeriesDuration(series: TrainingSeriesPhase) {
  const repeatCount = Number.isFinite(series.repeatCount)
    ? Math.max(0, Math.floor(series.repeatCount))
    : 0;

  return calculateSeriesCycleDuration(series) * repeatCount;
}

export function calculateTrainingSummary(phases: TrainingPhase[]): TrainingSummary {
  const zoneMinutes = { ...emptyZoneMinutes };
  const validationErrors: string[] = [];
  let totalMinutes = 0;

  phases.forEach((phase) => {
    if (phase.kind === "step") {
      const duration = calculateStepDuration(phase);

      if (duration <= 0) {
        validationErrors.push(`A etapa "${phase.name || "sem nome"}" precisa ter duração válida.`);
      }

      totalMinutes += duration;
      zoneMinutes[phase.boraZone] += duration;
      return;
    }

    if (!Number.isFinite(phase.repeatCount) || phase.repeatCount < 1) {
      validationErrors.push(`A série "${phase.name || "sem nome"}" precisa ter repetições válidas.`);
    }

    if (phase.steps.length === 0) {
      validationErrors.push(`A série "${phase.name || "sem nome"}" precisa ter ao menos uma etapa.`);
    }

    const repeatCount = Math.max(0, Math.floor(phase.repeatCount || 0));
    totalMinutes += calculateSeriesDuration(phase);

    phase.steps.forEach((step) => {
      const duration = calculateStepDuration(step);

      if (duration <= 0) {
        validationErrors.push(`A etapa "${step.name || "sem nome"}" precisa ter duração válida.`);
      }

      zoneMinutes[step.boraZone] += duration * repeatCount;
    });
  });

  if (totalMinutes <= 0) {
    validationErrors.push("A duração total do treino precisa ser maior que zero.");
  }

  return {
    mainPhasesCount: phases.length,
    totalMinutes,
    validationErrors,
    zoneMinutes,
  };
}

export function toTrainingBlockPayload(phases: TrainingPhase[]): TrainingBlockInput[] {
  return phases.flatMap((phase, phaseIndex) => {
    const sortOrder = phaseIndex + 1;

    if (phase.kind === "step") {
      return [toStepPayload(phase, sortOrder)];
    }

    const parentClientKey = phase.id;
    const group: TrainingBlockInput = {
      block_kind: "repeat_group",
      client_key: parentClientKey,
      name: phase.name || "Série",
      parent_client_key: null,
      repeat_count: Math.max(1, Math.floor(phase.repeatCount || 1)),
      sort_order: sortOrder,
      target_type: "time",
    };
    const children = phase.steps.map((step, stepIndex) => ({
      ...toStepPayload(step, stepIndex + 1),
      parent_client_key: parentClientKey,
    }));

    return [group, ...children];
  });
}

function toStepPayload(
  step: TrainingStepPhase,
  sortOrder: number,
): TrainingBlockInput {
  return {
    block_kind: "simple",
    block_type: step.blockType,
    bora_zone: step.boraZone,
    client_key: step.id,
    duration_seconds: Math.max(1, Math.round(step.durationMinutes * 60)),
    instruction: step.instruction.trim() || null,
    name: step.name.trim() || "Etapa",
    parent_client_key: null,
    sort_order: sortOrder,
    target_type: "time",
  };
}
