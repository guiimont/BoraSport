import Link from "next/link";

import type {
  BaseSchedule,
  CompanySlot,
  OperationalSession,
} from "../../../../types/saas";
import {
  getCompanyBaseSchedules,
  getCompanyBookings,
  getCompanyOperationalSessions,
  getCompanySlots,
} from "../../../../lib/saas/queries";
import { getManageAdminContext } from "../admin-context";
import { AdminShell } from "../admin-shell";
import styles from "../admin.module.css";
import {
  formatScheduleTime,
  weekdayLabels,
} from "./grade/base-schedule-utils";

type AdminAgendaPageProps = {
  params: Promise<{
    slug: string;
  }>;
  searchParams?: Promise<{
    date?: string;
    end?: string;
    start?: string;
    view?: string;
  }>;
};

type AgendaView = "month" | "period" | "week";
type AgendaActivityKind = "projected" | "slot" | "session";
type AgendaActivityStatus = "cancelled" | "draft" | "published";

type AgendaActivity = {
  coachName: string;
  dateKey: string;
  durationMinutes: number;
  href: string;
  id: string;
  isConcrete: boolean;
  kind: AgendaActivityKind;
  resourceCount: number;
  startTime: string;
  status: AgendaActivityStatus;
  title: string;
  trainingTitle: string | null;
};

const dateKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "America/Sao_Paulo",
  year: "numeric",
});

const weekRangeFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "numeric",
  month: "long",
  timeZone: "America/Sao_Paulo",
});

const monthTitleFormatter = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  timeZone: "America/Sao_Paulo",
  year: "numeric",
});

const dayNumberFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  timeZone: "America/Sao_Paulo",
});

const monthDayFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  timeZone: "America/Sao_Paulo",
  weekday: "short",
});

function toDateKey(date: Date) {
  return dateKeyFormatter.format(date);
}

function parseDateKey(value?: string | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${toDateKey(new Date())}T12:00:00-03:00`);
  }

  const date = new Date(`${value}T12:00:00-03:00`);

  return Number.isNaN(date.getTime())
    ? new Date(`${toDateKey(new Date())}T12:00:00-03:00`)
    : date;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);

  return next;
}

function getWeekStart(date: Date) {
  const localDate = new Date(`${toDateKey(date)}T12:00:00-03:00`);
  const day = localDate.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  localDate.setDate(localDate.getDate() + diffToMonday);

  return localDate;
}

function getMonthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1, 12);
}

function getMonthGridDays(monthStart: Date) {
  const firstWeekStart = getWeekStart(monthStart);

  return Array.from({ length: 42 }, (_, index) => {
    const date = addDays(firstWeekStart, index);

    return {
      currentMonth: date.getMonth() === monthStart.getMonth(),
      date,
      dateKey: toDateKey(date),
      weekday: date.getDay() === 0 ? 7 : date.getDay(),
    };
  });
}

function getPeriodDays(start: Date, end: Date) {
  const days: ReturnType<typeof getMonthGridDays> = [];

  for (let date = start; date <= end; date = addDays(date, 1)) {
    days.push({
      currentMonth: true,
      date,
      dateKey: toDateKey(date),
      weekday: date.getDay() === 0 ? 7 : date.getDay(),
    });
  }

  return days;
}

function formatSlotTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

function formatTimeValue(value: string) {
  return value.slice(0, 5);
}

function normalizeView(value?: string | null): AgendaView {
  if (value === "month" || value === "period") {
    return value;
  }

  return "week";
}

function getPeriodSelection({
  end,
  selectedDate,
  start,
  view,
}: {
  end?: string;
  selectedDate: Date;
  start?: string;
  view: AgendaView;
}) {
  if (view === "month") {
    const monthStart = getMonthStart(selectedDate);
    const monthDays = getMonthGridDays(monthStart);

    return {
      days: monthDays,
      end: monthDays[monthDays.length - 1].date,
      start: monthDays[0].date,
    };
  }

  if (view === "period" && start && end) {
    const requestedStart = parseDateKey(start);
    const requestedEnd = parseDateKey(end);

    if (requestedStart <= requestedEnd) {
      return {
        days: getPeriodDays(requestedStart, requestedEnd),
        end: requestedEnd,
        start: requestedStart,
      };
    }
  }

  const weekStart = getWeekStart(selectedDate);
  const weekEnd = addDays(weekStart, 6);

  return {
    days: getPeriodDays(weekStart, weekEnd),
    end: weekEnd,
    start: weekStart,
  };
}

function getStatusLabel(status: AgendaActivityStatus) {
  if (status === "cancelled") {
    return "Cancelada";
  }

  if (status === "published") {
    return "Publicada";
  }

  return "Rascunho";
}

function getStatusClass(status: AgendaActivityStatus) {
  if (status === "cancelled") {
    return styles.vesselStatus_manutencao;
  }

  if (status === "published") {
    return styles.vesselStatus_disponivel;
  }

  return styles.vesselStatus_inativa;
}

function getTrainingTitleFromSession(session: OperationalSession) {
  return session.training_plan_version?.training_plan?.title ?? null;
}

function makeSessionActivity({
  companySlug,
  session,
}: {
  companySlug: string;
  session: OperationalSession;
}): AgendaActivity {
  return {
    coachName: session.coach?.name || "Treinador",
    dateKey: session.session_date,
    durationMinutes: session.duration_minutes,
    href: `/admin/${companySlug}/agenda/sessoes/${session.id}`,
    id: `session:${session.id}`,
    isConcrete: true,
    kind: "session",
    resourceCount: session.resources.length,
    startTime: formatTimeValue(session.start_time),
    status: session.status,
    title: session.group_name,
    trainingTitle: getTrainingTitleFromSession(session),
  };
}

function makeProjectedActivity({
  companySlug,
  dateKey,
  schedule,
}: {
  companySlug: string;
  dateKey: string;
  schedule: BaseSchedule;
}): AgendaActivity {
  return {
    coachName: schedule.coach?.name || "Treinador",
    dateKey,
    durationMinutes: schedule.duration_minutes,
    href: `/admin/${companySlug}/agenda/grade/${schedule.id}?date=${dateKey}`,
    id: `projected:${schedule.id}:${dateKey}`,
    isConcrete: false,
    kind: "projected",
    resourceCount: schedule.resources.length,
    startTime: formatScheduleTime(schedule.start_time),
    status: schedule.status === "active" ? "draft" : "cancelled",
    title: schedule.group_name,
    trainingTitle: null,
  };
}

function makeLegacySlotActivity({
  companySlug,
  slot,
}: {
  companySlug: string;
  slot: CompanySlot;
}): AgendaActivity {
  return {
    coachName: "Treinador",
    dateKey: toDateKey(new Date(slot.start_time)),
    durationMinutes: slot.services?.duration_minutes ?? 0,
    href: `/admin/${companySlug}/agenda`,
    id: `slot:${slot.id}`,
    isConcrete: true,
    kind: "slot",
    resourceCount: slot.resource_id ? 1 : 0,
    startTime: formatSlotTime(slot.start_time),
    status: "published",
    title: slot.services?.name || "Sessão publicada",
    trainingTitle: null,
  };
}

function buildActivities({
  baseSchedules,
  companySlug,
  dateKeys,
  sessions,
  slots,
}: {
  baseSchedules: BaseSchedule[];
  companySlug: string;
  dateKeys: string[];
  sessions: OperationalSession[];
  slots: CompanySlot[];
}) {
  const activitiesByDate = new Map<string, AgendaActivity[]>();
  const concreteBaseOccurrences = new Set(
    sessions
      .filter((session) => session.base_schedule_id)
      .map((session) => `${session.base_schedule_id}:${session.session_date}`),
  );

  const add = (activity: AgendaActivity) => {
    activitiesByDate.set(activity.dateKey, [
      ...(activitiesByDate.get(activity.dateKey) ?? []),
      activity,
    ]);
  };

  for (const session of sessions) {
    add(makeSessionActivity({ companySlug, session }));
  }

  for (const dateKey of dateKeys) {
    const date = parseDateKey(dateKey);
    const weekday = date.getDay() === 0 ? 7 : date.getDay();

    for (const schedule of baseSchedules) {
      if (schedule.weekday !== weekday || schedule.status !== "active") {
        continue;
      }

      if (concreteBaseOccurrences.has(`${schedule.id}:${dateKey}`)) {
        continue;
      }

      add(makeProjectedActivity({ companySlug, dateKey, schedule }));
    }
  }

  for (const slot of slots) {
    const dateKey = toDateKey(new Date(slot.start_time));

    if (dateKeys.includes(dateKey)) {
      add(makeLegacySlotActivity({ companySlug, slot }));
    }
  }

  for (const [dateKey, activities] of activitiesByDate) {
    activitiesByDate.set(
      dateKey,
      activities.sort((a, b) => a.startTime.localeCompare(b.startTime)),
    );
  }

  return activitiesByDate;
}

export default async function AdminAgendaPage({
  params,
  searchParams,
}: AdminAgendaPageProps) {
  const { slug } = await params;
  const resolvedSearchParams = (await searchParams) ?? {};
  const context = await getManageAdminContext(slug);
  const { company } = context;
  const view = normalizeView(resolvedSearchParams.view);
  const selectedDate = parseDateKey(resolvedSearchParams.date);
  const monthStart = getMonthStart(selectedDate);
  const period = getPeriodSelection({
    end: resolvedSearchParams.end,
    selectedDate,
    start: resolvedSearchParams.start,
    view,
  });
  const periodStartKey = toDateKey(period.start);
  const periodEndKey = toDateKey(period.end);
  const requestedDateKey = toDateKey(selectedDate);
  const selectedDateKey =
    requestedDateKey >= periodStartKey && requestedDateKey <= periodEndKey
      ? requestedDateKey
      : periodStartKey;
  const [slots, bookings, baseSchedules, sessions] =
    await Promise.all([
      getCompanySlots(company.id),
      getCompanyBookings(company.id),
      getCompanyBaseSchedules(company.id),
      getCompanyOperationalSessions({
        companyId: company.id,
        endDate: periodEndKey,
        startDate: periodStartKey,
      }),
    ]);
  const dateKeys = period.days.map((day) => day.dateKey);
  const activitiesByDate = buildActivities({
    baseSchedules,
    companySlug: company.slug,
    dateKeys,
    sessions,
    slots,
  });
  const selectedDayActivities = activitiesByDate.get(selectedDateKey) ?? [];
  const confirmedBookings = bookings.filter(
    (booking) => booking.status === "confirmed",
  );
  const periodLength = period.days.length;
  const previousStart = addDays(period.start, -periodLength);
  const previousEnd = addDays(period.end, -periodLength);
  const nextStart = addDays(period.start, periodLength);
  const nextEnd = addDays(period.end, periodLength);
  const todayKey = toDateKey(new Date());
  const periodLabel =
    view === "month"
      ? monthTitleFormatter.format(monthStart)
      : `${weekRangeFormatter.format(period.start)} a ${weekRangeFormatter.format(
          period.end,
        )}`;
  const buildPeriodHref = (start: Date, end: Date, date = start) =>
    `/admin/${company.slug}/agenda?view=period&start=${toDateKey(start)}&end=${toDateKey(
      end,
    )}&date=${toDateKey(date)}`;

  return (
    <AdminShell
      active="agenda"
      context={context}
      subtitle="Planeje datas, sessões, canoas e o treino do dia em uma única Agenda operacional."
      title="Agenda"
    >
      <section className={styles.agendaToolbar}>
        <div>
          <p className={styles.eyebrow}>Agenda operacional</p>
          <h2>{periodLabel}</h2>
          <p>
            {sessions.length} sessões concretas · {baseSchedules.length} recorrências ·{" "}
            {confirmedBookings.length} reservas recentes
          </p>
        </div>
        <div className={styles.agendaActions}>
          <div className={styles.agendaViewToggle} aria-label="Modo da agenda">
            <Link
              aria-current={view === "week" ? "page" : undefined}
              className={view === "week" ? styles.navPillActive : styles.navPill}
              href={`/admin/${company.slug}/agenda?view=week&date=${selectedDateKey}`}
            >
              Semana
            </Link>
            <Link
              aria-current={view === "month" ? "page" : undefined}
              className={view === "month" ? styles.navPillActive : styles.navPill}
              href={`/admin/${company.slug}/agenda?view=month&date=${selectedDateKey}`}
            >
              Mês
            </Link>
          </div>
          <form className={styles.agendaPeriodFilter} method="get">
            <input name="view" type="hidden" value="period" />
            <label>
              De
              <input defaultValue={periodStartKey} name="start" required type="date" />
            </label>
            <label>
              Até
              <input defaultValue={periodEndKey} name="end" required type="date" />
            </label>
            <button type="submit">Aplicar período</button>
          </form>
          <Link
            className={styles.secondaryButton}
            href={buildPeriodHref(previousStart, previousEnd)}
          >
            Anterior
          </Link>
          <Link
            className={styles.secondaryButton}
            href={`/admin/${company.slug}/agenda?view=week&date=${todayKey}`}
          >
            Hoje
          </Link>
          <Link
            className={styles.secondaryButton}
            href={buildPeriodHref(nextStart, nextEnd)}
          >
            Próximo
          </Link>
          <Link
            className={styles.primaryButtonLink}
            href={`/admin/${company.slug}/agenda/novo?date=${selectedDateKey}`}
          >
            Novo horário
          </Link>
          <details className={styles.agendaMoreActions}>
            <summary>Mais</summary>
            <div>
              <Link href={`/admin/${company.slug}/agenda/grade`}>
                Recorrências
              </Link>
              <Link href={`/admin/${company.slug}/treinos`}>
                Biblioteca de treinos
              </Link>
            </div>
          </details>
        </div>
      </section>

      <PeriodAgenda
        activitiesByDate={activitiesByDate}
        companySlug={company.slug}
        days={period.days}
        periodEndKey={periodEndKey}
        periodStartKey={periodStartKey}
        selectedDateKey={selectedDateKey}
        selectedDayActivities={selectedDayActivities}
      />

      <section className={styles.infoBox}>
        <strong>Como a Agenda funciona</strong>
        <p>
          A grade-base gera atividades projetadas apenas para o período aberto.
          Quando uma data recebe treino, cancelamento ou edição própria, a sessão
          concreta prevalece e a recorrência não aparece duplicada.
        </p>
      </section>
    </AdminShell>
  );
}

function PeriodAgenda({
  activitiesByDate,
  companySlug,
  days,
  periodEndKey,
  periodStartKey,
  selectedDateKey,
  selectedDayActivities,
}: {
  activitiesByDate: Map<string, AgendaActivity[]>;
  companySlug: string;
  days: ReturnType<typeof getPeriodDays>;
  periodEndKey: string;
  periodStartKey: string;
  selectedDateKey: string;
  selectedDayActivities: AgendaActivity[];
}) {
  return (
    <>
      <section className={styles.agendaMonthGrid} aria-label="Agenda do período">
        {days.map((day) => {
          const activities = activitiesByDate.get(day.dateKey) ?? [];

          return (
            <Link
              className={`${styles.agendaMonthCell} ${
                day.currentMonth ? "" : styles.agendaMonthCellMuted
              } ${selectedDateKey === day.dateKey ? styles.agendaMonthCellActive : ""}`}
              href={`/admin/${companySlug}/agenda?view=period&start=${periodStartKey}&end=${periodEndKey}&date=${day.dateKey}#dia-selecionado`}
              key={day.dateKey}
            >
              <strong>{dayNumberFormatter.format(day.date)}</strong>
              <span>{weekdayLabels[day.weekday].slice(0, 3)}</span>
              <div>
                {activities.slice(0, 3).map((activity) => (
                  <small key={activity.id}>
                    {activity.startTime} · {activity.title}
                  </small>
                ))}
                {activities.length > 3 ? (
                  <small>+{activities.length - 3} atividades</small>
                ) : null}
              </div>
            </Link>
          );
        })}
      </section>

      <section className={styles.agendaSelectedDay} id="dia-selecionado">
        <div className={styles.sectionHeadBalanced}>
          <div>
            <p className={styles.eyebrow}>Dia selecionado</p>
            <h2>{monthDayFormatter.format(parseDateKey(selectedDateKey))}</h2>
          </div>
          <Link
            className={styles.primaryButtonLink}
            href={`/admin/${companySlug}/agenda/novo?date=${selectedDateKey}`}
          >
            Novo horário neste dia
          </Link>
        </div>
        <AgendaDay
          activities={selectedDayActivities}
          dateLabel={monthDayFormatter.format(parseDateKey(selectedDateKey))}
        />
      </section>
    </>
  );
}

function AgendaDay({
  activities,
  dateLabel,
}: {
  activities: AgendaActivity[];
  dateLabel: string;
}) {
  return (
    <article className={styles.agendaDayCard}>
      <div className={styles.agendaDayHeader}>
        <div>
          <p className={styles.eyebrow}>{dateLabel}</p>
          <h2>{activities.length} atividade{activities.length === 1 ? "" : "s"}</h2>
        </div>
        <span className={styles.statusBadge}>
          {activities.length === 0 ? "Sem horários" : "Operação"}
        </span>
      </div>

      {activities.length > 0 ? (
        <div className={styles.agendaSessionList}>
          {activities.map((activity) => (
            <AgendaActivityCard activity={activity} key={activity.id} />
          ))}
        </div>
      ) : (
        <div className={styles.emptyStateCompact}>
          <strong>Dia sem horários</strong>
          <p>Use “Novo horário” para criar uma sessão ou recorrência.</p>
        </div>
      )}
    </article>
  );
}

function AgendaActivityCard({ activity }: { activity: AgendaActivity }) {
  return (
    <Link className={styles.agendaSessionCard} href={activity.href}>
      <span className={styles.baseScheduleTime}>{activity.startTime}</span>
      <span className={styles.baseScheduleMain}>
        <strong>{activity.title}</strong>
        <small>Treinador: {activity.coachName}</small>
        <small>
          {activity.trainingTitle
            ? `Treino: ${activity.trainingTitle}`
            : "Treino ainda não definido"}
        </small>
        <small>
          {activity.resourceCount} canoa{activity.resourceCount === 1 ? "" : "s"} ·{" "}
          {activity.durationMinutes || "--"} min
        </small>
      </span>
      <span className={getStatusClass(activity.status)}>
        {getStatusLabel(activity.status)}
      </span>
      <span className={styles.agendaDetailsLink}>
        {activity.kind === "projected" ? "Recorrência" : "Detalhes"}
      </span>
    </Link>
  );
}
