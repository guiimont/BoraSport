"use client";

import { useActionState, useMemo } from "react";
import Link from "next/link";
import { useFormStatus } from "react-dom";

import type { TrainingPlanLibraryItem } from "../../../../types/saas";
import { linkOperationalSessionTraining, type AdminFormState } from "../actions";
import styles from "../admin.module.css";

type SessionTrainingFormProps = {
  companyId: string;
  currentTrainingPlanVersionId: string | null;
  sessionId: string;
  slug: string;
  trainingPlans: TrainingPlanLibraryItem[];
};

const initialState: AdminFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button className={styles.primaryButton} disabled={pending} type="submit">
      {pending ? "Atualizando..." : "Salvar treino"}
    </button>
  );
}

export function SessionTrainingForm({
  companyId,
  currentTrainingPlanVersionId,
  sessionId,
  slug,
  trainingPlans,
}: SessionTrainingFormProps) {
  const [state, action] = useActionState(
    linkOperationalSessionTraining,
    initialState,
  );
  const publishedVersions = useMemo(
    () =>
      trainingPlans
        .filter((plan) => plan.status === "active" && !plan.archived_at)
        .flatMap((plan) =>
          plan.training_plan_versions
            .filter((version) => version.status === "published")
            .map((version) => ({ plan, version })),
        )
        .sort((a, b) =>
          a.plan.title.localeCompare(b.plan.title, "pt-BR"),
        ),
    [trainingPlans],
  );

  return (
    <form action={action} className={styles.trainingPicker}>
      <input name="companyId" type="hidden" value={companyId} />
      <input name="sessionId" type="hidden" value={sessionId} />
      <input name="slug" type="hidden" value={slug} />

      <label className={styles.label}>
        Treino da Biblioteca
        <select
          className={styles.select}
          defaultValue={currentTrainingPlanVersionId ?? ""}
          name="trainingPlanVersionId"
        >
          <option value="">Treino ainda não definido</option>
          {publishedVersions.map(({ plan, version }) => (
            <option key={version.id} value={version.id}>
              {plan.title} · v{version.version_number}
            </option>
          ))}
        </select>
        {publishedVersions.length === 0 ? (
          <span className={styles.fieldHelp}>
            Nenhum treino publicado na biblioteca.
          </span>
        ) : null}
      </label>

      <div className={styles.builderSubmitRow}>
        <SubmitButton />
        {currentTrainingPlanVersionId ? (
          <button
            className={styles.secondaryButton}
            name="trainingPlanVersionId"
            type="submit"
            value=""
          >
            Remover vínculo
          </button>
        ) : null}
        <Link className={styles.secondaryButton} href={`/admin/${slug}/treinos`}>
          Escolher na biblioteca
        </Link>
        <Link className={styles.secondaryButton} href={`/admin/${slug}/treinos/novo`}>
          Criar novo treino
        </Link>
      </div>

      {state.success ? <p className={styles.success}>{state.success}</p> : null}
      {state.error ? <p className={styles.error}>{state.error}</p> : null}
    </form>
  );
}
