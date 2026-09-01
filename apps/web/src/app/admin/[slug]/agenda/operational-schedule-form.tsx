"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { useFormStatus } from "react-dom";

import type {
  BaseSchedule,
  CompanyMember,
  CompanyLocation,
  OperationalSession,
  OperationalSessionStatus,
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
  initialSession?: OperationalSession | null;
  initialTrainingPlanVersionId?: string;
  members: CompanyMember[];
  locations: CompanyLocation[];
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
          label: `${plan.title} · v${version.version_number}`,
          plan,
          version,
        })),
    )
    .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
}

function SubmitButton({ editing }: { editing: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button className={styles.primaryButton} disabled={pending} type="submit">
      {pending ? "Salvando..." : editing ? "Salvar alterações" : "Salvar horário"}
    </button>
  );
}

export function OperationalScheduleForm({
  companyId,
  initialDate,
  initialSchedule = null,
  initialSession = null,
  initialTrainingPlanVersionId = "",
  members,
  locations,
  resources,
  slug,
  trainingPlans,
}: OperationalScheduleFormProps) {
  const [state, action] = useActionState(saveOperationalSchedule, initialState);
  const [selectedResources, setSelectedResources] = useState(
    () => new Set<string>(
      (initialSession?.resources ?? initialSchedule?.resources ?? []).map(
        (item) => item.resource_id,
      ),
    ),
  );
  const [recurrenceMode, setRecurrenceMode] = useState("single");
  const [status, setStatus] = useState<OperationalSessionStatus>(
    initialSession?.status ?? "draft",
  );
  const [selectedLocationId, setSelectedLocationId] = useState(
    initialSession?.location_id ?? initialSchedule?.location_id ?? "",
  );
  const coaches = members.filter(
    (member) => member.role === "admin" || member.role === "professional",
  );
  const publishedVersions = useMemo(
    () => getPublishedVersions(trainingPlans),
    [trainingPlans],
  );
  const initialTraining = publishedVersions.find(
    ({ version }) =>
      version.id ===
      (initialSession?.training_plan_version_id ?? initialTrainingPlanVersionId),
  );
  const initialDurationMinutes = initialTraining?.version.duration_seconds
    ? Math.round(initialTraining.version.duration_seconds / 60)
    : 60;
  const initialLevel = initialTraining?.version.level
    ? {
        avancado: "Avançado",
        competicao: "Competição",
        iniciante: "Iniciante",
        intermediario: "Intermediário",
        personalizado: "Personalizado",
      }[initialTraining.version.level]
    : "";
  const selectedResourceRows = resources.filter((resource) =>
    selectedResources.has(resource.id),
  );
  const selectedPublicSpots = selectedResourceRows.reduce(
    (total, resource) => total + getPublicSpotsForResource(resource),
    0,
  );

  return (
    <form
      action={action}
      className={styles.builderLayout}
      onSubmit={(event) => {
        if (
          initialSession &&
          initialSession.status !== "cancelled" &&
          status === "cancelled" &&
          !window.confirm(
            "Cancelar esta sessão? Ela deixará de aparecer para novas reservas.",
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <input name="companyId" type="hidden" value={companyId} />
      <input name="slug" type="hidden" value={slug} />
      {initialSchedule ? (
        <input name="baseScheduleId" type="hidden" value={initialSchedule.id} />
      ) : null}
      {initialSession ? (
        <>
          <input name="sessionId" type="hidden" value={initialSession.id} />
          {initialSession.base_schedule_id ? (
            <input
              name="baseScheduleId"
              type="hidden"
              value={initialSession.base_schedule_id}
            />
          ) : null}
        </>
      ) : null}

      <div className={styles.builderMain}>
        <section className={styles.builderHero}>
          <p className={styles.eyebrow}>Agenda</p>
          <h2>
            {initialSession
              ? "Editar sessão"
              : initialSchedule
                ? "Planejar sessão do dia"
                : "Novo horário"}
          </h2>
          <p>
            {initialSession
              ? "Ajuste somente esta sessão. A grade semanal permanece inalterada."
              : initialSchedule
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
                defaultValue={initialSession?.session_date ?? initialDate}
                name="sessionDate"
                required
                type="date"
              />
            </label>
            <label className={styles.label}>
              Horário
              <input
                className={styles.input}
                defaultValue={
                  initialSession?.start_time.slice(0, 5) ??
                  initialSchedule?.start_time.slice(0, 5) ??
                  "06:00"
                }
                name="startTime"
                required
                type="time"
              />
            </label>
            <label className={styles.label}>
              Duração
              <input
                className={styles.input}
                defaultValue={
                  initialSession?.duration_minutes ??
                  initialSchedule?.duration_minutes ??
                  initialDurationMinutes
                }
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
                defaultValue={
                  initialSession?.group_name ??
                  initialSchedule?.group_name ??
                  initialTraining?.plan.title ??
                  ""
                }
                name="groupName"
                placeholder="Treino regular"
                required
              />
            </label>
            <label className={styles.label}>
              Nível opcional
              <input
                className={styles.input}
                defaultValue={
                  initialSession?.level ?? initialSchedule?.level ?? initialLevel
                }
                name="level"
                placeholder="Iniciante, misto, avançado..."
              />
            </label>
          </div>
          <div className={styles.builderGrid}>
            <label className={styles.label}>
              Base
              <select
                className={styles.select}
                name="locationId"
                onChange={(event) => {
                  setSelectedLocationId(event.target.value);
                  setSelectedResources(new Set());
                }}
                required
                value={selectedLocationId}
              >
                <option value="">Selecione</option>
                {locations.filter((location) => location.is_active || location.id === initialSession?.location_id || location.id === initialSchedule?.location_id).map((location) => (
                  <option key={location.id} value={location.id}>{location.name}</option>
                ))}
              </select>
              {locations.length === 0 ? (
                <span className={styles.fieldHelp}>
                  Cadastre uma <Link href={`/admin/${slug}/bases`}>base</Link> antes da sessão.
                </span>
              ) : null}
            </label>
            <label className={styles.label}>
              Treinador
              <select
                className={styles.select}
                defaultValue={
                  initialSession?.coach_id ??
                  initialSchedule?.coach_id ??
                  initialTraining?.plan.coach_id ??
                  ""
                }
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
              Situação
              <select
                className={styles.select}
                name="status"
                onChange={(event) =>
                  setStatus(event.target.value as OperationalSessionStatus)
                }
                value={status}
              >
                <option value="draft">Rascunho</option>
                <option value="published">Publicada</option>
                <option value="cancelled">Cancelada</option>
              </select>
            </label>
          </div>
          {!initialSchedule && !initialSession ? <fieldset className={styles.checkPanel}>
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
            {resources.filter((resource) => resource.location_id === selectedLocationId).map((resource) => {
              const checked = selectedResources.has(resource.id);
              const status = getResourceStatus(resource);
              const disabled = status !== "disponivel" && !checked;

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
                    {status !== "disponivel" ? (
                      <em>
                        {checked
                          ? "Já vinculada; remova para escolher outra"
                          : "Canoa indisponível"}
                      </em>
                    ) : null}
                  </span>
                </label>
              );
            })}
            {selectedLocationId && resources.every((resource) => resource.location_id !== selectedLocationId) ? (
              <p className={styles.fieldHelp}>Nenhuma canoa disponível nesta base.</p>
            ) : null}
            {!selectedLocationId ? (
              <p className={styles.fieldHelp}>Selecione a base para ver as canoas disponíveis.</p>
            ) : null}
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
            <select
              className={styles.select}
              defaultValue={initialTraining?.version.id ?? ""}
              name="trainingPlanVersionId"
            >
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
          <SubmitButton editing={Boolean(initialSession)} />
          <Link className={styles.secondaryButton} href={`/admin/${slug}/agenda`}>
            Voltar para Agenda
          </Link>
          <div aria-live="polite">
            {state.success ? <p className={styles.success}>{state.success}</p> : null}
            {state.error ? <p className={styles.error}>{state.error}</p> : null}
          </div>
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
