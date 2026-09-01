"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { useFormStatus } from "react-dom";

import type {
  BaseSchedule,
  BaseScheduleStatus,
  CompanyMember,
  CompanyLocation,
  Resource,
} from "../../../../../types/saas";
import { saveBaseSchedule, type AdminFormState } from "../../actions";
import styles from "../../admin.module.css";
import {
  formatScheduleTime,
  getPublicSpotsForResource,
  getResourceStatus,
  steererPolicyLabels,
  vesselLabels,
  vesselStatusLabels,
  weekdayLabels,
} from "./base-schedule-utils";

type BaseScheduleFormProps = {
  companyId: string;
  existingSchedules: BaseSchedule[];
  members: CompanyMember[];
  locations: CompanyLocation[];
  resources: Resource[];
  schedule?: BaseSchedule | null;
  slug: string;
};

const initialState: AdminFormState = {};

function SubmitButton({ editing }: { editing: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button className={styles.primaryButton} disabled={pending} type="submit">
      {pending ? "Salvando..." : editing ? "Salvar horário" : "Criar horário"}
    </button>
  );
}

function Feedback({ state }: { state: AdminFormState }) {
  if (state.success) {
    return <p className={styles.success}>{state.success}</p>;
  }

  if (state.error) {
    return <p className={styles.error}>{state.error}</p>;
  }

  return null;
}

function getStartMinute(time: string) {
  const [hour, minute] = time.split(":").map(Number);

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return null;
  }

  return hour * 60 + minute;
}

function hasKnownConflict({
  durationMinutes,
  existingSchedules,
  resourceId,
  scheduleId,
  startTime,
  weekday,
}: {
  durationMinutes: number;
  existingSchedules: BaseSchedule[];
  resourceId: string;
  scheduleId?: string;
  startTime: string;
  weekday: number;
}) {
  const startMinute = getStartMinute(startTime);

  if (startMinute === null) {
    return false;
  }

  const endMinute = startMinute + durationMinutes;

  return existingSchedules.some((schedule) => {
    if (
      schedule.id === scheduleId ||
      schedule.status !== "active" ||
      schedule.weekday !== weekday
    ) {
      return false;
    }

    const usesResource = schedule.resources.some(
      (item) => item.resource_id === resourceId,
    );

    if (!usesResource) {
      return false;
    }

    const otherStart = getStartMinute(formatScheduleTime(schedule.start_time));
    const otherEnd = otherStart === null ? null : otherStart + schedule.duration_minutes;

    return otherStart !== null && otherEnd !== null && otherStart < endMinute && startMinute < otherEnd;
  });
}

export function BaseScheduleForm({
  companyId,
  existingSchedules,
  members,
  locations,
  resources,
  schedule = null,
  slug,
}: BaseScheduleFormProps) {
  const [state, action] = useActionState(saveBaseSchedule, initialState);
  const isEditing = Boolean(schedule?.id);
  const [weekday, setWeekday] = useState(schedule?.weekday ?? 1);
  const [startTime, setStartTime] = useState(
    schedule ? formatScheduleTime(schedule.start_time) : "06:00",
  );
  const [durationMinutes, setDurationMinutes] = useState(
    schedule?.duration_minutes ?? 60,
  );
  const [selectedResources, setSelectedResources] = useState(
    new Set(schedule?.resources.map((item) => item.resource_id) ?? []),
  );
  const [selectedLocationId, setSelectedLocationId] = useState(
    schedule?.location_id ?? "",
  );
  const coaches = members.filter(
    (member) => member.role === "admin" || member.role === "professional",
  );
  const selectedResourceRows = resources.filter((resource) =>
    selectedResources.has(resource.id),
  );
  const selectedPublicSpots = selectedResourceRows.reduce(
    (total, resource) => total + getPublicSpotsForResource(resource),
    0,
  );

  const resourcesWithState = useMemo(
    () =>
      resources.filter((resource) => resource.location_id === selectedLocationId).map((resource) => {
        const alreadyLinked = schedule?.resources.some(
          (item) => item.resource_id === resource.id,
        );
        const unavailable = getResourceStatus(resource) !== "disponivel";
        const conflict = hasKnownConflict({
          durationMinutes,
          existingSchedules,
          resourceId: resource.id,
          scheduleId: schedule?.id,
          startTime,
          weekday,
        });

        return {
          alreadyLinked,
          conflict,
          disabled: (!alreadyLinked && unavailable) || conflict,
          resource,
          unavailable,
        };
      }),
    [durationMinutes, existingSchedules, schedule, selectedLocationId, startTime, weekday, resources],
  );

  return (
    <form action={action} className={styles.builderLayout}>
      <input name="companyId" type="hidden" value={companyId} />
      <input name="slug" type="hidden" value={slug} />
      {isEditing ? <input name="scheduleId" type="hidden" value={schedule?.id} /> : null}

      <div className={styles.builderMain}>
        <section className={styles.builderHero}>
          <p className={styles.eyebrow}>Grade-base</p>
          <h2>{isEditing ? "Editar horário" : "Novo horário recorrente"}</h2>
          <p>
            Defina o modelo operacional da semana. Esta etapa não publica vagas
            na agenda pública.
          </p>
        </section>

        <section className={styles.builderSectionCompact}>
          <div className={styles.builderSectionIntro}>
            <span>Turma</span>
            <h2>Dados do horário</h2>
            <p>Dia, hora, duração, nome da turma e treinador responsável.</p>
          </div>
          <div className={styles.builderGridThree}>
            <label className={styles.label}>
              Dia da semana
              <select
                className={styles.select}
                name="weekday"
                onChange={(event) => setWeekday(Number(event.target.value))}
                value={weekday}
              >
                {Object.entries(weekdayLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              {locations.length === 0 ? (
                <span className={styles.fieldHelp}>
                  Cadastre uma <Link href={`/admin/${slug}/bases`}>base</Link> antes do horário.
                </span>
              ) : null}
            </label>
            <label className={styles.label}>
              Horário inicial
              <input
                className={styles.input}
                name="startTime"
                onChange={(event) => setStartTime(event.target.value)}
                required
                type="time"
                value={startTime}
              />
            </label>
            <label className={styles.label}>
              Duração
              <input
                className={styles.input}
                max="360"
                min="5"
                name="durationMinutes"
                onChange={(event) =>
                  setDurationMinutes(Math.max(5, Number(event.target.value)))
                }
                required
                type="number"
                value={durationMinutes}
              />
            </label>
          </div>
          <div className={styles.builderGrid}>
            <label className={styles.label}>
              Nome da turma
              <input
                className={styles.input}
                defaultValue={schedule?.group_name ?? ""}
                name="groupName"
                placeholder="Treino regular"
                required
              />
            </label>
            <label className={styles.label}>
              Nível opcional
              <input
                className={styles.input}
                defaultValue={schedule?.level ?? ""}
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
                {locations.filter((location) => location.is_active || location.id === schedule?.location_id).map((location) => (
                  <option key={location.id} value={location.id}>{location.name}</option>
                ))}
              </select>
            </label>
            <label className={styles.label}>
              Treinador
              <select
                className={styles.select}
                defaultValue={schedule?.coach_id ?? ""}
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
                defaultValue={schedule?.status ?? "active"}
                name="status"
              >
                <option value="active">Ativo</option>
                <option value="inactive">Inativo</option>
              </select>
            </label>
          </div>
        </section>

        <section className={styles.builderSectionCompact}>
          <div className={styles.builderSectionIntro}>
            <span>Canoas</span>
            <h2>Frota vinculada</h2>
            <p>
              Selecione uma ou mais canoas disponíveis. Conflitos conhecidos
              ficam bloqueados antes do salvamento.
            </p>
          </div>
          <div className={styles.baseResourceGrid}>
            {resourcesWithState.map(({ alreadyLinked, conflict, disabled, resource, unavailable }) => {
              const checked = selectedResources.has(resource.id);
              const vesselClass = resource.vessel_class
                ? vesselLabels[resource.vessel_class]
                : "Classe não definida";
              const status = getResourceStatus(resource);

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
                  <span className={styles.vesselAvatar} aria-hidden="true">
                    {(resource.name || "C").slice(0, 1)}
                  </span>
                  <span>
                    <strong>{resource.name}</strong>
                    <small>
                      {vesselClass} · capacidade {resource.capacity_maxima} ·{" "}
                      {getPublicSpotsForResource(resource)} vagas públicas
                    </small>
                    <small>
                      {resource.default_steerer_policy
                        ? steererPolicyLabels[resource.default_steerer_policy]
                        : "Leme não se aplica"}
                    </small>
                    {conflict ? <em>Conflito neste horário</em> : null}
                    {unavailable && !alreadyLinked ? (
                      <em>{vesselStatusLabels[status]}</em>
                    ) : null}
                    {unavailable && alreadyLinked ? (
                      <em>Vínculo preservado · {vesselStatusLabels[status]}</em>
                    ) : null}
                  </span>
                </label>
              );
            })}
          </div>
        </section>

        <div className={styles.builderStickyActions}>
          <SubmitButton editing={isEditing} />
          <Link className={styles.secondaryButton} href={`/admin/${slug}/agenda/grade`}>
            Voltar
          </Link>
          <Feedback state={state} />
        </div>
      </div>

      <aside className={styles.builderSummaryPanel}>
        <p className={styles.eyebrow}>Resumo</p>
        <h2>{weekdayLabels[weekday]}</h2>
        <div className={styles.summaryHeroNumber}>{selectedPublicSpots}</div>
        <p>vagas públicas</p>
        <div className={styles.vesselSummaryList}>
          <div>
            <span>Canoas selecionadas</span>
            <strong>{selectedResources.size}</strong>
          </div>
          <div>
            <span>Horário</span>
            <strong>{startTime}</strong>
          </div>
          <div>
            <span>Duração</span>
            <strong>{durationMinutes} min</strong>
          </div>
        </div>
        <p>
          {selectedResources.size} canoa{selectedResources.size === 1 ? "" : "s"}{" "}
          selecionada{selectedResources.size === 1 ? "" : "s"} ·{" "}
          {selectedPublicSpots} vagas públicas
        </p>
      </aside>
    </form>
  );
}
