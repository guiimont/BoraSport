import Link from "next/link";

import {
  getCompanyBaseSchedules,
  getCompanyBookings,
  getCompanySlots,
  getCompanyWeeklyWorkouts,
} from "../../../../lib/saas/queries";
import { getManageAdminContext } from "../admin-context";
import { AdminShell } from "../admin-shell";
import styles from "../admin.module.css";
import {
  formatScheduleTime,
  getPublicSpotsForSchedule,
  weekdayLabels,
} from "./grade/base-schedule-utils";

type AdminAgendaPageProps = {
  params: Promise<{
    slug: string;
  }>;
  searchParams?: Promise<{
    dia?: string;
    semana?: string;
  }>;
};

const dayFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "America/Sao_Paulo",
});

const longDayFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "long",
  timeZone: "America/Sao_Paulo",
  weekday: "long",
});

function toDateKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
    year: "numeric",
  }).format(date);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);

  return next;
}

function getWeekStart(value?: string | null) {
  const base = value ? new Date(`${value}T12:00:00-03:00`) : new Date();
  const safeBase = Number.isNaN(base.getTime()) ? new Date() : base;
  const localDate = new Date(`${toDateKey(safeBase)}T12:00:00-03:00`);
  const day = localDate.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  localDate.setDate(localDate.getDate() + diffToMonday);

  return localDate;
}

function getWeekDays(weekStart: Date) {
  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(weekStart, index);
    const weekday = index + 1;

    return {
      date,
      dateKey: toDateKey(date),
      label: weekdayLabels[weekday],
      shortLabel: weekdayLabels[weekday].slice(0, 3),
      weekday,
    };
  });
}

function formatSlotTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

function getSlotStatus(slot: Awaited<ReturnType<typeof getCompanySlots>>[number]) {
  if (slot.spots_occupied >= slot.spots_total) {
    return "Lotada";
  }

  return "Publicada";
}

export default async function AdminAgendaPage({
  params,
  searchParams,
}: AdminAgendaPageProps) {
  const { slug } = await params;
  const resolvedSearchParams = (await searchParams) ?? {};
  const context = await getManageAdminContext(slug);
  const { company } = context;
  const weekStart = getWeekStart(resolvedSearchParams.semana);
  const weekDays = getWeekDays(weekStart);
  const weekStartKey = toDateKey(weekStart);
  const todayKey = toDateKey(new Date());
  const selectedDayKey =
    resolvedSearchParams.dia &&
    weekDays.some((day) => day.dateKey === resolvedSearchParams.dia)
      ? resolvedSearchParams.dia
      : weekDays.find((day) => day.dateKey === todayKey)?.dateKey ?? weekDays[0].dateKey;
  const [slots, bookings, baseSchedules, weeklyWorkouts] = await Promise.all([
    getCompanySlots(company.id),
    getCompanyBookings(company.id),
    getCompanyBaseSchedules(company.id),
    getCompanyWeeklyWorkouts(company.id),
  ]);
  const slotsByDate = new Map<string, typeof slots>();

  for (const slot of slots) {
    const dateKey = toDateKey(new Date(slot.start_time));

    if (weekDays.some((day) => day.dateKey === dateKey)) {
      slotsByDate.set(dateKey, [...(slotsByDate.get(dateKey) ?? []), slot]);
    }
  }

  const workoutsByWeekday = new Map(
    weeklyWorkouts.map((workout) => [workout.weekday, workout]),
  );
  const confirmedBookings = bookings.filter(
    (booking) => booking.status === "confirmed",
  );
  const previousWeekKey = toDateKey(addDays(weekStart, -7));
  const nextWeekKey = toDateKey(addDays(weekStart, 7));

  return (
    <AdminShell
      active="agenda"
      context={context}
      subtitle="Acompanhe a semana, organize recorrências e publique sessões a partir de uma única agenda operacional."
      title="Agenda"
    >
      <section className={styles.agendaToolbar}>
        <div>
          <p className={styles.eyebrow}>Semana operacional</p>
          <h2>
            {dayFormatter.format(weekDays[0].date)} a{" "}
            {dayFormatter.format(weekDays[6].date)}
          </h2>
          <p>
            {slots.length} sessões futuras · {baseSchedules.length} recorrências
            configuradas · {confirmedBookings.length} reservas confirmadas recentes
          </p>
        </div>
        <div className={styles.agendaActions}>
          <Link
            className={styles.secondaryButton}
            href={`/admin/${company.slug}/agenda?semana=${previousWeekKey}`}
          >
            Semana anterior
          </Link>
          <Link className={styles.secondaryButton} href={`/admin/${company.slug}/agenda`}>
            Hoje
          </Link>
          <Link
            className={styles.secondaryButton}
            href={`/admin/${company.slug}/agenda?semana=${nextWeekKey}`}
          >
            Próxima semana
          </Link>
          <Link
            className={styles.primaryButtonLink}
            href={`/admin/${company.slug}/agenda/grade/novo?semana=${weekStartKey}`}
          >
            Novo horário
          </Link>
          <details className={styles.agendaMoreActions}>
            <summary>Ações</summary>
            <div>
              <Link href={`/admin/${company.slug}/agenda/grade`}>
                Configurar recorrências
              </Link>
              <Link href={`/admin/${company.slug}/treinos`}>
                Biblioteca de treinos
              </Link>
            </div>
          </details>
        </div>
      </section>

      <nav className={styles.dayScroller} aria-label="Datas da semana">
        {weekDays.map((day) => (
          <Link
            aria-current={selectedDayKey === day.dateKey ? "page" : undefined}
            className={`${styles.dayPill} ${
              selectedDayKey === day.dateKey ? styles.dayPillActive : ""
            }`}
            href={`/admin/${company.slug}/agenda?semana=${weekStartKey}&dia=${day.dateKey}`}
            key={day.dateKey}
          >
            {day.shortLabel}
            <span>{dayFormatter.format(day.date)}</span>
          </Link>
        ))}
      </nav>

      <section className={styles.agendaDayList}>
        {weekDays
          .filter((day) => day.dateKey === selectedDayKey)
          .map((day) => (
            <AgendaDay
              baseSchedules={baseSchedules.filter(
                (schedule) => schedule.weekday === day.weekday,
              )}
              companySlug={company.slug}
              dateLabel={longDayFormatter.format(day.date)}
              key={day.dateKey}
              slots={slotsByDate.get(day.dateKey) ?? []}
              workoutTitle={workoutsByWeekday.get(day.weekday)?.title ?? null}
            />
          ))}
      </section>

      <section className={styles.agendaWeekGrid} aria-label="Agenda semanal">
        {weekDays.map((day) => (
          <AgendaDay
            baseSchedules={baseSchedules.filter(
              (schedule) => schedule.weekday === day.weekday,
            )}
            companySlug={company.slug}
            dateLabel={longDayFormatter.format(day.date)}
            key={day.dateKey}
            slots={slotsByDate.get(day.dateKey) ?? []}
            workoutTitle={workoutsByWeekday.get(day.weekday)?.title ?? null}
          />
        ))}
      </section>

      <section className={styles.infoBox}>
        <strong>Camadas da Agenda</strong>
        <p>
          Recorrência organiza o modelo semanal. Sessões publicadas abrem vagas
          reais para remadores. O vínculo com treinos usa a biblioteca existente
          e será aplicado por sessão concreta.
        </p>
      </section>
    </AdminShell>
  );
}

function AgendaDay({
  baseSchedules,
  companySlug,
  dateLabel,
  slots,
  workoutTitle,
}: {
  baseSchedules: Awaited<ReturnType<typeof getCompanyBaseSchedules>>;
  companySlug: string;
  dateLabel: string;
  slots: Awaited<ReturnType<typeof getCompanySlots>>;
  workoutTitle: string | null;
}) {
  const hasItems = slots.length > 0 || baseSchedules.length > 0;

  return (
    <article className={styles.agendaDayCard}>
      <div className={styles.agendaDayHeader}>
        <div>
          <p className={styles.eyebrow}>{dateLabel}</p>
          <h2>
            {workoutTitle ? `Treino: ${workoutTitle}` : "Treino ainda não definido"}
          </h2>
        </div>
        <span className={styles.statusBadge}>
          {slots.length} publicada{slots.length === 1 ? "" : "s"}
        </span>
      </div>

      {hasItems ? (
        <div className={styles.agendaSessionList}>
          {slots.map((slot) => (
            <div className={styles.agendaSessionCard} key={slot.id}>
              <span className={styles.baseScheduleTime}>
                {formatSlotTime(slot.start_time)}
              </span>
              <span className={styles.baseScheduleMain}>
                <strong>{slot.services?.name || "Sessão publicada"}</strong>
                <small>
                  {slot.resources?.name || "Canoa"} ·{" "}
                  {slot.services?.duration_minutes || "--"} min
                </small>
                <small>
                  {slot.spots_occupied}/{slot.spots_total} ocupadas · Treino ainda
                  não definido
                </small>
              </span>
              <span
                className={
                  getSlotStatus(slot) === "Lotada"
                    ? styles.vesselStatus_manutencao
                    : styles.vesselStatus_disponivel
                }
              >
                {getSlotStatus(slot)}
              </span>
            </div>
          ))}
          {baseSchedules.map((schedule) => (
            <Link
              className={styles.agendaSessionCard}
              href={`/admin/${companySlug}/agenda/grade/${schedule.id}`}
              key={schedule.id}
            >
              <span className={styles.baseScheduleTime}>
                {formatScheduleTime(schedule.start_time)}
              </span>
              <span className={styles.baseScheduleMain}>
                <strong>{schedule.group_name}</strong>
                <small>
                  {schedule.coach?.name || "Treinador"} ·{" "}
                  {schedule.duration_minutes} min
                </small>
                <small>
                  {schedule.resources.length} canoa
                  {schedule.resources.length === 1 ? "" : "s"} ·{" "}
                  {getPublicSpotsForSchedule(schedule)} vagas · Treino ainda não
                  definido
                </small>
              </span>
              <span
                className={
                  schedule.status === "active"
                    ? styles.vesselStatus_inativa
                    : styles.vesselStatus_manutencao
                }
              >
                {schedule.status === "active" ? "Rascunho" : "Inativa"}
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <div className={styles.emptyStateCompact}>
          <strong>Dia sem horários</strong>
          <p>Crie um horário para esta data ou configure uma recorrência semanal.</p>
        </div>
      )}
    </article>
  );
}
