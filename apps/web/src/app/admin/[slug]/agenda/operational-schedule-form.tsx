"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { useFormStatus } from "react-dom";

import type {
  CompanyMember,
  Resource,
  TrainingPlanLibraryItem,
} from "../../../../types/saas";
import { saveOperationalSchedule, type AdminFormState } from "../actions";
import styles from "../admin.module.css";
import {
  getPublicSpotsForResource,
  getResourceStatus,
  vesselLabels,
} from "./grade/base-schedule-utils";

type OperationalScheduleFormProps = {
  companyId: string;
  initialDate: string;
  members: CompanyMember[];
  resources: Resource[];
  slug: string;
  trainingPlans: TrainingPlanLibraryItem[];
};

const initialState: AdminFormState = {};

function getPublishedVersions(trainingPlans: TrainingPlanLibraryItem[]) {
  return trainingPlans.flatMap((plan) =>
    plan.training_plan_versions
      .filter((version) => version.status === "published")
      .map((version) => ({
        label: `${plan.title} · v${version.version_number}`,
        plan,
        version,
      })),
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button className={styles.primaryButton} disabled={pending} type="submit">
      {pending ? "Salvando..." : "Salvar horário"}
    </button>
  );
}

export function OperationalScheduleForm({
  companyId,
  initialDate,
  members,
  resources,
  slug,
  trainingPlans,
}: OperationalScheduleFormProps) {
  const [state, action] = useActionState(saveOperationalSchedule, initialState);
  const [selectedResources, setSelectedResources] = useState(new Set<string>());
  const [recurrenceMode, setRecurrenceMode] = useState("single");
  const coaches = members.filter(
    (member) => member.role === "admin" || member.role === "professional",
  );
  const publishedVersions = useMemo(
    () => getPublishedVersions(trainingPlans),
    [trainingPlans],
  );
  const selectedResourceRows = resources.filter((resource) =>
    selectedResources.has(resource.id),
  );
  const selectedPublicSpots = selectedResourceRows.reduce(
    (total, resource) => total + getPublicSpotsForResource(resource),
    0,
  );

  return (
    <form action={action} className={styles.builderLayout}>
      <input name="companyId" type="hidden" value={companyId} />
      <input name="slug" type="hidden" value={slug} />

      <div className={styles.builderMain}>
        <section className={styles.builderHero}>
          <p className={styles.eyebrow}>Agenda</p>
          <h2>Novo horário</h2>
          <p>
            Crie uma sessão concreta para uma data ou salve uma recorrência
            semanal usando a grade-base.
          </p>
        </section>

        <section className={styles.builderSectionCompact}>
          <div className={styles.builderSectionIntro}>
            <span>Planejamento</span>
            <h2>Quando acontece</h2>
            <p>Defina data, hora, duração, turma e treinador responsável.</p>
          </div>
          <div className={styles.builderGridThree}>
            <label className={styles.label}>
              Data
              <input
                className={styles.input}
                defaultValue={initialDate}
                name="sessionDate"
                required
                type="date"
              />
            </label>
            <label className={styles.label}>
              Horário
              <input
                className={styles.input}
                defaultValue="06:00"
                name="startTime"
                required
                type="time"
              />
            </label>
            <label className={styles.label}>
              Duração
              <input
                className={styles.input}
                defaultValue="60"
                max="360"
                min="5"
                name="durationMinutes"
                required
                type="number"
              />
            </label>
          </div>
          <div className={styles.builderGrid}>
            <label className={styles.label}>
              Turma ou atividade
              <input
                className={styles.input}
                name="groupName"
                placeholder="Treino regular"
                required
              />
            </label>
            <label className={styles.label}>
              Nível opcional
              <input
                className={styles.input}
                name="level"
                placeholder="Iniciante, misto, avançado..."
              />
            </label>
          </div>
          <div className={styles.builderGrid}>
            <label className={styles.label}>
              Treinador
              <select className={styles.select} name="coachId" required>
                <option value="">Selecione</option>
                {coaches.map((member) => (
                  <option key={member.user_id} value={member.user_id}>
                    {member.profile?.name || "Treinador sem perfil"}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.label}>
              Situação inicial
              <select className={styles.select} defaultValue="draft" name="status">
                <option value="draft">Rascunho</option>
                <option value="published">Publicada</option>
                <option value="cancelled">Cancelada</option>
              </select>
            </label>
          </div>
          <fieldset className={styles.checkPanel}>
            <legend>Recorrência</legend>
            <div className={styles.agendaModeGrid}>
              <label className={styles.baseResourceOption}>
                <input
                  checked={recurrenceMode === "single"}
                  name="recurrenceMode"
                  onChange={() => setRecurrenceMode("single")}
                  type="radio"
                  value="single"
                />
                <span>
                  <strong>Somente nesta data</strong>
                  <small>Cria uma sessão concreta para o dia selecionado.</small>
                </span>
              </label>
              <label className={styles.baseResourceOption}>
                <input
                  checked={recurrenceMode === "weekly"}
                  name="recurrenceMode"
                  onChange={() => setRecurrenceMode("weekly")}
                  type="radio"
                  value="weekly"
                />
                <span>
                  <strong>Repetir semanalmente</strong>
                  <small>Cria uma grade-base no mesmo dia da semana.</small>
                </span>
              </label>
            </div>
          </fieldset>
        </section>

        <section className={styles.builderSectionCompact}>
          <div className={styles.builderSectionIntro}>
            <span>Canoas</span>
            <h2>Frota da sessão</h2>
            <p>Use apenas canoas disponíveis. A capacidade vem da frota cadastrada.</p>
          </div>
          <div className={styles.baseResourceGrid}>
            {resources.map((resource) => {
              const checked = selectedResources.has(resource.id);
              const status = getResourceStatus(resource);
              const disabled = status !== "disponivel";

              return (
                <label
                  className={`${styles.baseResourceOption} ${
                    checked ? styles.baseResourceOptionSelected : ""
                  }`}
                  key={resource.id}
                >
                  <input
                    checked={checked}
                    disabled={disabled}
                    name="resourceIds"
                    onChange={(event) => {
                      const next = new Set(selectedResources);

                      if (event.target.checked) {
                        next.add(resource.id);
                      } else {
                        next.delete(resource.id);
                      }

                      setSelectedResources(next);
                    }}
                    type="checkbox"
                    value={resource.id}
                  />
                  <span>
                    <strong>{resource.name}</strong>
                    <small>
                      {resource.vessel_class
                        ? vesselLabels[resource.vessel_class]
                        : "Classe não definida"}{" "}
                      · capacidade {resource.capacity_maxima}
                    </small>
                    {disabled ? <em>Canoa indisponível</em> : null}
                  </span>
                </label>
              );
            })}
          </div>
        </section>

        <section className={styles.builderSectionCompact}>
          <div className={styles.builderSectionIntro}>
            <span>Treino do dia</span>
            <h2>Biblioteca de treinos</h2>
            <p>Opcional. O vínculo fica nesta sessão, não na recorrência inteira.</p>
          </div>
          <label className={styles.label}>
            Treino vinculado
            <select className={styles.select} name="trainingPlanVersionId">
              <option value="">Treino ainda não definido</option>
              {publishedVersions.map(({ label, version }) => (
                <option key={version.id} value={version.id}>
                  {label}
                </option>
              ))}
            </select>
            {publishedVersions.length === 0 ? (
              <span className={styles.fieldHelp}>
                Nenhum treino publicado na biblioteca.
              </span>
            ) : null}
          </label>
        </section>

        <div className={styles.builderStickyActions}>
          <SubmitButton />
          <Link className={styles.secondaryButton} href={`/admin/${slug}/agenda`}>
            Voltar para Agenda
          </Link>
          {state.success ? <p className={styles.success}>{state.success}</p> : null}
          {state.error ? <p className={styles.error}>{state.error}</p> : null}
        </div>
      </div>

      <aside className={styles.builderSummaryPanel}>
        <p className={styles.eyebrow}>Resumo</p>
        <h2>{recurrenceMode === "weekly" ? "Recorrente" : "Sessão do dia"}</h2>
        <div className={styles.summaryHeroNumber}>{selectedPublicSpots}</div>
        <p>vagas públicas estimadas</p>
        <div className={styles.vesselSummaryList}>
          <div>
            <span>Canoas</span>
            <strong>{selectedResources.size}</strong>
          </div>
          <div>
            <span>Tipo</span>
            <strong>{recurrenceMode === "weekly" ? "Semanal" : "Avulso"}</strong>
          </div>
        </div>
      </aside>
    </form>
  );
}
