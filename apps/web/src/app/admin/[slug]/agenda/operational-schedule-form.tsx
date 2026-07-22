"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { useFormStatus } from "react-dom";

import type {
  BaseSchedule,
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
  initialSchedule?: BaseSchedule | null;
  members: CompanyMember[];
  resources: Resource[];
  slug: string;
  trainingPlans: TrainingPlanLibraryItem[];
};

const initialState: AdminFormState = {};

function getPublishedVersions(trainingPlans: TrainingPlanLibraryItem[]) {
  return trainingPlans
    .filter((plan) => plan.status === "active" && !plan.archived_at)
    .flatMap((plan) =>
      plan.training_plan_versions
        .filter((version) => version.status === "published")
        .map((version) => ({
          label: `${plan.title} · ${vesselLabels[plan.vessel_class]} · v${version.version_number}`,
          plan,
          version,
        })),
    )
    .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
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
  initialSchedule = null,
  members,
  resources,
  slug,
  trainingPlans,
}: OperationalScheduleFormProps) {
  const [state, action] = useActionState(saveOperationalSchedule, initialState);
  const [selectedResources, setSelectedResources] = useState(
    new Set<string>(initialSchedule?.resources.map((item) => item.resource_id) ?? []),
  );
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
      {initialSchedule ? (
        <input name="baseScheduleId" type="hidden" value={initialSchedule.id} />
      ) : null}

      <div className={styles.builderMain}>
        <section className={styles.builderHero}>
          <p className={styles.eyebrow}>Agenda</p>
          <h2>{initialSchedule ? "Planejar sessão do dia" : "Novo horário"}</h2>
          <p>
            {initialSchedule
              ? "Revise os dados desta ocorrência e escolha o treino que será realizado."
              : "Crie uma sessão para uma data ou defina um horário semanal recorrente."}
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
                defaultValue={initialSchedule?.start_time.slice(0, 5) ?? "06:00"}
                name="startTime"
                required
                type="time"
              />
            </label>
            <label className={styles.label}>
              Duração
              <input
                className={styles.input}
                defaultValue={initialSchedule?.duration_minutes ?? 60}
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
                defaultValue={initialSchedule?.group_name ?? ""}
                name="groupName"
                placeholder="Treino regular"
                required
              />
            </label>
            <label className={styles.label}>
              Nível opcional
              <input
                className={styles.input}
                defaultValue={initialSchedule?.level ?? ""}
                name="level"
                placeholder="Iniciante, misto, avançado..."
              />
            </label>
          </div>
          <div className={styles.builderGrid}>
            <label className={styles.label}>
              Treinador
              <select
                className={styles.select}
                defaultValue={initialSchedule?.coach_id ?? ""}
                name="coachId"
                required
              >
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
          {!initialSchedule ? <fieldset className={styles.checkPanel}>
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
                  <small>Repete este horário no mesmo dia da semana.</small>
                </span>
              </label>
            </div>
          </fieldset> : (
            <div className={styles.infoBox}>
              <strong>Alteração somente nesta data</strong>
              <p>As outras ocorrências semanais permanecem como estão.</p>
            </div>
          )}
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
            <h2>Qual treino será executado?</h2>
            <p>Escolha um treino da Biblioteca ou crie um novo. O vínculo vale somente para esta sessão.</p>
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
          <Link
            className={styles.secondaryButton}
            href={`/admin/${slug}/treinos/novo`}
          >
            Criar novo treino
          </Link>
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
