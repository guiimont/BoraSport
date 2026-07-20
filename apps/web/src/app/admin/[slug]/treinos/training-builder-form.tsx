"use client";

import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";

import type {
  BoraZone,
  TrainingBlockType,
  TrainingVersionLevel,
  VesselClass,
} from "../../../../types/saas";
import {
  createStructuredTrainingPlan,
  type TrainingBuilderState,
} from "./actions";
import {
  calculateSeriesCycleDuration,
  calculateSeriesDuration,
  calculateTrainingSummary,
  type TrainingPhase,
  type TrainingSeriesPhase,
  type TrainingStepPhase,
} from "./training-builder-model";
import styles from "../admin.module.css";

type TrainingBuilderFormProps = {
  slug: string;
};

const initialState: TrainingBuilderState = {};

const vesselOptions: Array<{ label: string; value: VesselClass }> = [
  { label: "V1", value: "v1" },
  { label: "OC1", value: "oc1" },
  { label: "V3", value: "v3" },
  { label: "OC4", value: "oc4" },
  { label: "V6", value: "v6" },
  { label: "OC6", value: "oc6" },
  { label: "Outro", value: "outro" },
];

const levelOptions: Array<{ label: string; value: TrainingVersionLevel }> = [
  { label: "Iniciante", value: "iniciante" },
  { label: "Intermediário", value: "intermediario" },
  { label: "Avançado", value: "avancado" },
  { label: "Competição", value: "competicao" },
  { label: "Personalizado", value: "personalizado" },
];

const stepTypeOptions: Array<{ label: string; value: TrainingBlockType }> = [
  { label: "Aquecimento", value: "aquecimento" },
  { label: "Técnica", value: "tecnica" },
  { label: "Base", value: "base" },
  { label: "Ritmo", value: "ritmo" },
  { label: "Forte", value: "forte" },
  { label: "Largada/Tiro", value: "largada" },
  { label: "Recuperação", value: "recuperacao" },
  { label: "Descanso e hidratação", value: "descanso_hidratacao" },
  { label: "Desaquecimento", value: "volta_calma" },
];

const zoneOptions: Array<{ label: string; value: BoraZone }> = [
  { label: "Z1 Recuperar", value: "z1_recuperar" },
  { label: "Z2 Base", value: "z2_base" },
  { label: "Z3 Ritmo", value: "z3_ritmo" },
  { label: "Z4 Forte", value: "z4_forte" },
  { label: "Z5 Máximo", value: "z5_maximo" },
];

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createStep(overrides: Partial<TrainingStepPhase> = {}): TrainingStepPhase {
  return {
    boraZone: "z2_base",
    blockType: "base",
    durationMinutes: 10,
    id: createId("step"),
    instruction: "",
    kind: "step",
    name: "Aquecimento",
    ...overrides,
  };
}

function createSeries(): TrainingSeriesPhase {
  return {
    id: createId("series"),
    kind: "series",
    name: "Série principal",
    repeatCount: 3,
    steps: [
      createStep({
        blockType: "largada",
        boraZone: "z5_maximo",
        durationMinutes: 1,
        instruction: "Tiro forte com saída controlada.",
        name: "Tiro/Largada",
      }),
      createStep({
        blockType: "recuperacao",
        boraZone: "z1_recuperar",
        durationMinutes: 1,
        instruction: "Parado.",
        name: "Recuperação parada",
      }),
    ],
  };
}

function phaseDuration(phase: TrainingPhase) {
  return phase.kind === "series"
    ? calculateSeriesDuration(phase)
    : phase.durationMinutes;
}

function phaseSummary(phase: TrainingPhase) {
  if (phase.kind === "series") {
    const cycle = calculateSeriesCycleDuration(phase);
    const total = calculateSeriesDuration(phase);

    return `${phase.repeatCount} repetições · ${cycle} min por ciclo · ${total} min`;
  }

  const zoneLabel = zoneOptions.find((zone) => zone.value === phase.boraZone)?.label;

  return `${phase.durationMinutes} min · ${zoneLabel || "Zona não definida"}`;
}

function SubmitButton({
  children,
  disabled,
  value,
}: {
  children: string;
  disabled: boolean;
  value: "draft" | "publish";
}) {
  const { pending } = useFormStatus();

  return (
    <button
      className={value === "publish" ? styles.primaryButton : styles.secondaryButton}
      disabled={disabled || pending}
      name="intent"
      type="submit"
      value={value}
    >
      {pending ? "Salvando..." : children}
    </button>
  );
}

export function TrainingBuilderForm({ slug }: TrainingBuilderFormProps) {
  const [state, action] = useActionState(createStructuredTrainingPlan, initialState);
  const [phases, setPhases] = useState<TrainingPhase[]>([
    createStep({
      blockType: "aquecimento",
      boraZone: "z2_base",
      instruction: "Foco técnico.",
      name: "Aquecimento",
    }),
  ]);
  const [editingId, setEditingId] = useState(phases[0]?.id ?? "");
  const summary = useMemo(() => calculateTrainingSummary(phases), [phases]);
  const canSubmit = summary.validationErrors.length === 0;

  function updatePhase(phaseId: string, patch: Partial<TrainingPhase>) {
    setPhases((current) =>
      current.map((phase) =>
        phase.id === phaseId ? ({ ...phase, ...patch } as TrainingPhase) : phase,
      ),
    );
  }

  function updateSeriesStep(
    seriesId: string,
    stepId: string,
    patch: Partial<TrainingStepPhase>,
  ) {
    setPhases((current) =>
      current.map((phase) => {
        if (phase.kind !== "series" || phase.id !== seriesId) {
          return phase;
        }

        return {
          ...phase,
          steps: phase.steps.map((step) =>
            step.id === stepId ? { ...step, ...patch } : step,
          ),
        };
      }),
    );
  }

  function removePhase(phaseId: string) {
    setPhases((current) => current.filter((phase) => phase.id !== phaseId));
    setEditingId((currentId) => (currentId === phaseId ? "" : currentId));
  }

  function movePhase(phaseId: string, direction: -1 | 1) {
    setPhases((current) => {
      const index = current.findIndex((phase) => phase.id === phaseId);
      const nextIndex = index + direction;

      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) {
        return current;
      }

      const next = [...current];
      const [phase] = next.splice(index, 1);
      next.splice(nextIndex, 0, phase);
      return next;
    });
  }

  function addPhase(phase: TrainingPhase) {
    setPhases((current) => [...current, phase]);
    setEditingId(phase.id);
  }

  return (
    <form action={action} className={styles.trainingBuilder}>
      <input name="slug" type="hidden" value={slug} />
      <input name="phasesJson" type="hidden" value={JSON.stringify(phases)} />
      <input name="durationMinutes" type="hidden" value={summary.totalMinutes} />

      <section className={styles.builderHero}>
        <div>
          <p className={styles.eyebrow}>Rascunho</p>
          <h2>Novo treino estruturado</h2>
          <p>
            Monte a sessão como o treinador pensa: aquecimento, série principal,
            recuperação e desaquecimento.
          </p>
        </div>
      </section>

      <div className={styles.builderLayout}>
        <div className={styles.builderMain}>
          <section className={styles.builderSectionCompact}>
            <div className={styles.builderSectionIntro}>
              <span>Informações essenciais</span>
              <h2>Identidade do treino</h2>
            </div>
            <div className={styles.builderGrid}>
              <label className={styles.label}>
                Nome
                <input
                  className={styles.input}
                  name="title"
                  placeholder="Treino de tiro e recuperação"
                  required
                />
              </label>
              <label className={styles.label}>
                Classe de embarcação
                <select className={styles.select} name="vesselClass">
                  {vesselOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.label}>
                Objetivo
                <textarea
                  className={styles.textarea}
                  name="objective"
                  placeholder="Ex: desenvolver largada forte e recuperação completa entre tiros."
                  rows={4}
                />
              </label>
            </div>
          </section>

          <section className={styles.builderSectionCompact}>
            <div className={styles.builderSectionIntro}>
              <span>Configuração</span>
              <h2>Nível e segurança</h2>
            </div>
            <div className={styles.builderGrid}>
              <label className={styles.label}>
                Nível
                <select className={styles.select} name="level">
                  {levelOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.label}>
                Observações de segurança
                <input
                  className={styles.input}
                  name="safetyNotes"
                  placeholder="Ex: revisar vento, corrente e hidratação."
                />
              </label>
              <input name="technicalNotes" type="hidden" value="" />
            </div>
          </section>

          <section className={styles.builderSectionCompact}>
            <div className={styles.builderSectionIntro}>
              <span>Estrutura do treino</span>
              <h2>Linha do tempo</h2>
              <p>Somente a fase em edição abre os campos. As demais ficam compactas.</p>
            </div>

            <div className={styles.phaseTimeline}>
              {phases.map((phase, index) => (
                <article className={styles.phaseCard} key={phase.id}>
                  <div className={styles.phaseCollapsed}>
                    <span className={styles.phaseNumber}>
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <strong>{phase.name || (phase.kind === "series" ? "Série" : "Etapa")}</strong>
                      <p>{phaseSummary(phase)}</p>
                      {phase.kind === "series" ? (
                        <ul>
                          {phase.steps.map((step) => (
                            <li key={step.id}>
                              {step.name} — {step.durationMinutes} min —{" "}
                              {zoneOptions.find((zone) => zone.value === step.boraZone)?.label}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p>{phase.instruction || "Sem instrução adicional."}</p>
                      )}
                    </div>
                    <div className={styles.phaseActions}>
                      <button onClick={() => setEditingId(phase.id)} type="button">
                        Editar
                      </button>
                      <button onClick={() => movePhase(phase.id, -1)} type="button">
                        ↑
                      </button>
                      <button onClick={() => movePhase(phase.id, 1)} type="button">
                        ↓
                      </button>
                      <button onClick={() => removePhase(phase.id)} type="button">
                        Remover
                      </button>
                    </div>
                  </div>

                  {editingId === phase.id ? (
                    phase.kind === "series" ? (
                      <SeriesEditor
                        onAddStep={() =>
                          updatePhase(phase.id, {
                            steps: [...phase.steps, createStep({ name: "Nova etapa" })],
                          } as Partial<TrainingPhase>)
                        }
                        onRemoveStep={(stepId) =>
                          updatePhase(phase.id, {
                            steps: phase.steps.filter((step) => step.id !== stepId),
                          } as Partial<TrainingPhase>)
                        }
                        onUpdate={updatePhase}
                        onUpdateStep={updateSeriesStep}
                        series={phase}
                      />
                    ) : (
                      <StepEditor
                        onUpdate={(patch) => updatePhase(phase.id, patch)}
                        step={phase}
                      />
                    )
                  ) : null}
                </article>
              ))}
            </div>

            <div className={styles.phaseAddActions}>
              <button
                className={styles.secondaryButton}
                onClick={() => addPhase(createStep({ name: "Nova etapa" }))}
                type="button"
              >
                + Adicionar etapa
              </button>
              <button
                className={styles.secondaryButton}
                onClick={() => addPhase(createSeries())}
                type="button"
              >
                + Adicionar série
              </button>
            </div>
          </section>
        </div>

        <aside className={styles.builderSummaryPanel}>
          <p className={styles.eyebrow}>Resumo</p>
          <h2>Treino</h2>
          <div className={styles.summaryHeroNumber}>{summary.totalMinutes} min</div>
          <p>{summary.mainPhasesCount} fases principais</p>
          <div className={styles.zoneSummaryList}>
            {zoneOptions.map((zone) => {
              const minutes = summary.zoneMinutes[zone.value];
              const percentage =
                summary.totalMinutes > 0
                  ? Math.round((minutes / summary.totalMinutes) * 100)
                  : 0;

              return (
                <div className={styles.zoneSummaryItem} key={zone.value}>
                  <span>{zone.label}</span>
                  <strong>{minutes} min</strong>
                  <div>
                    <i style={{ width: `${percentage}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          {summary.validationErrors.length > 0 ? (
            <p className={styles.error} role="alert">
              {summary.validationErrors[0]}
            </p>
          ) : null}
          {state.error ? (
            <p className={styles.error} role="alert">
              {state.error}
            </p>
          ) : null}
        </aside>
      </div>

      <div className={styles.builderStickyActions}>
        <SubmitButton disabled={!canSubmit} value="draft">
          Salvar rascunho
        </SubmitButton>
        <button
          className={styles.secondaryButton}
          onClick={() => setEditingId("")}
          type="button"
        >
          Revisar treino
        </button>
        <SubmitButton disabled={!canSubmit} value="publish">
          Publicar versão
        </SubmitButton>
      </div>
    </form>
  );
}

function StepEditor({
  onUpdate,
  step,
}: {
  onUpdate: (patch: Partial<TrainingStepPhase>) => void;
  step: TrainingStepPhase;
}) {
  return (
    <div className={styles.phaseEditor}>
      <div className={styles.builderGridThree}>
        <label className={styles.label}>
          Nome
          <input
            className={styles.input}
            onChange={(event) => onUpdate({ name: event.currentTarget.value })}
            value={step.name}
          />
        </label>
        <label className={styles.label}>
          Tipo
          <select
            className={styles.select}
            onChange={(event) =>
              onUpdate({ blockType: event.currentTarget.value as TrainingBlockType })
            }
            value={step.blockType}
          >
            {stepTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <DurationStepper
          label="Duração"
          onChange={(durationMinutes) => onUpdate({ durationMinutes })}
          value={step.durationMinutes}
        />
        <label className={styles.label}>
          Zona Bora
          <select
            className={styles.select}
            onChange={(event) =>
              onUpdate({ boraZone: event.currentTarget.value as BoraZone })
            }
            value={step.boraZone}
          >
            {zoneOptions.map((zone) => (
              <option key={zone.value} value={zone.value}>
                {zone.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className={styles.label}>
        Instrução opcional
        <textarea
          className={styles.textarea}
          onChange={(event) => onUpdate({ instruction: event.currentTarget.value })}
          placeholder="Ex: foco técnico, remada solta, parado, recuperação completa."
          rows={3}
          value={step.instruction}
        />
      </label>
    </div>
  );
}

function SeriesEditor({
  onAddStep,
  onRemoveStep,
  onUpdate,
  onUpdateStep,
  series,
}: {
  onAddStep: () => void;
  onRemoveStep: (stepId: string) => void;
  onUpdate: (phaseId: string, patch: Partial<TrainingPhase>) => void;
  onUpdateStep: (
    seriesId: string,
    stepId: string,
    patch: Partial<TrainingStepPhase>,
  ) => void;
  series: TrainingSeriesPhase;
}) {
  const cycleMinutes = calculateSeriesCycleDuration(series);
  const totalMinutes = calculateSeriesDuration(series);

  return (
    <div className={styles.phaseEditor}>
      <div className={styles.builderGridThree}>
        <label className={styles.label}>
          Nome da série
          <input
            className={styles.input}
            onChange={(event) => onUpdate(series.id, { name: event.currentTarget.value })}
            value={series.name}
          />
        </label>
        <RepetitionStepper
          onChange={(repeatCount) => onUpdate(series.id, { repeatCount })}
          value={series.repeatCount}
        />
        <div className={styles.seriesComputed}>
          <span>Resultado</span>
          <strong>
            {series.repeatCount} repetições · {cycleMinutes} min por ciclo ·{" "}
            {totalMinutes} min
          </strong>
        </div>
      </div>

      <div className={styles.seriesSteps}>
        {series.steps.map((step) => (
          <article className={styles.seriesStepCard} key={step.id}>
            <StepEditor
              onUpdate={(patch) => onUpdateStep(series.id, step.id, patch)}
              step={step}
            />
            <button
              className={styles.secondaryButton}
              onClick={() => onRemoveStep(step.id)}
              type="button"
            >
              Remover etapa da série
            </button>
          </article>
        ))}
      </div>

      <button className={styles.secondaryButton} onClick={onAddStep} type="button">
        Adicionar etapa à série
      </button>
    </div>
  );
}

function DurationStepper({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: number) => void;
  value: number;
}) {
  return (
    <label className={styles.label}>
      {label}
      <span className={styles.stepperField}>
        <button onClick={() => onChange(Math.max(1, value - 1))} type="button">
          -
        </button>
        <input
          min="1"
          onChange={(event) => onChange(Number(event.currentTarget.value))}
          type="number"
          value={value}
        />
        <span>min</span>
        <button onClick={() => onChange(value + 1)} type="button">
          +
        </button>
      </span>
    </label>
  );
}

function RepetitionStepper({
  onChange,
  value,
}: {
  onChange: (value: number) => void;
  value: number;
}) {
  return (
    <label className={styles.label}>
      Repetições
      <span className={styles.stepperField}>
        <button onClick={() => onChange(Math.max(1, value - 1))} type="button">
          -
        </button>
        <input
          min="1"
          onChange={(event) => onChange(Number(event.currentTarget.value))}
          type="number"
          value={value}
        />
        <span>x</span>
        <button onClick={() => onChange(value + 1)} type="button">
          +
        </button>
      </span>
    </label>
  );
}
