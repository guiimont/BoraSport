import Link from "next/link";
import type { CSSProperties } from "react";

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
    coach?: string;
    date?: string;
    end?: string;
    start?: string;
    view?: string;
  }>;
};

type AgendaView = "day" | "fortnight" | "month" | "period" | "week";
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
  locationName: string;
  resourceCount: number;
  startTime: string;
  status: AgendaActivityStatus;
  title: string;
  trainingHref: string | null;
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
  if (
    value === "day" ||
    value === "fortnight" ||
    value === "month" ||
    value === "period"
  ) {
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

  if (view === "day") {
    return {
      days: getPeriodDays(selectedDate, selectedDate),
      end: selectedDate,
      start: selectedDate,
    };
  }

  if (view === "fortnight") {
    const fortnightStart = getWeekStart(selectedDate);
    const fortnightEnd = addDays(fortnightStart, 13);

    return {
      days: getPeriodDays(fortnightStart, fortnightEnd),
      end: fortnightEnd,
      start: fortnightStart,
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
    locationName: session.location?.name ?? "Base a definir",
    resourceCount: session.resources.length,
    startTime: formatTimeValue(session.start_time),
    status: session.status,
    title: session.group_name,
    trainingHref: session.training_plan_version?.training_plan
      ? `/admin/${companySlug}/treinos/${session.training_plan_version.training_plan.id}`
      : null,
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
    href: `/admin/${companySlug}/agenda/novo?date=${dateKey}&baseScheduleId=${schedule.id}`,
    id: `projected:${schedule.id}:${dateKey}`,
    isConcrete: false,
    kind: "projected",
    locationName: schedule.location?.name ?? "Base a definir",
    resourceCount: schedule.resources.length,
    startTime: formatScheduleTime(schedule.start_time),
    status: schedule.status === "active" ? "draft" : "cancelled",
    title: schedule.group_name,
    trainingHref: null,
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
    locationName: "Base a definir",
    resourceCount: slot.resource_id ? 1 : 0,
    startTime: formatSlotTime(slot.start_time),
    status: "published",
    title: slot.services?.name || "Sessão publicada",
    trainingHref: null,
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
  const coachFilter = resolvedSearchParams.coach?.trim() ?? "";
  const coachNames = Array.from(
    new Set(
      Array.from(activitiesByDate.values())
        .flat()
        .map((activity) => activity.coachName),
    ),
  ).sort((a, b) => a.localeCompare(b, "pt-BR"));
  const visibleActivitiesByDate = new Map(
    Array.from(activitiesByDate.entries()).map(([dateKey, activities]) => [
      dateKey,
      coachFilter
        ? activities.filter((activity) => activity.coachName === coachFilter)
        : activities,
    ]),
  );
  const visibleActivities = Array.from(visibleActivitiesByDate.values()).flat();
  const selectedDayActivities = visibleActivitiesByDate.get(selectedDateKey) ?? [];
  const confirmedBookings = bookings.filter(
    (booking) => booking.status === "confirmed",
  );
  const periodLength = period.days.length;
  const previousStart = addDays(period.start, -periodLength);
  const nextStart = addDays(period.start, periodLength);
  const todayKey = toDateKey(new Date());
  const periodLabel =
    view === "month"
      ? monthTitleFormatter.format(monthStart)
      : view === "day"
        ? monthDayFormatter.format(period.start)
      : `${weekRangeFormatter.format(period.start)} a ${weekRangeFormatter.format(
          period.end,
        )}`;
  return (
    <AdminShell
      active="agenda"
      context={context}
      subtitle="Planeje datas, sessões, canoas e o treino do dia em uma única Agenda operacional."
      title="Agenda"
    >
      <section className={styles.agendaToolbar}>
        <div className={styles.agendaHeading}>
          <p className={styles.eyebrow}>Agenda operacional</p>
          <h2>{periodLabel}</h2>
          <p>
            Visualize a operação por horário e abra qualquer sessão para planejar
            treino, canoas e participantes.
          </p>
        </div>
        <div className={styles.agendaControls}>
          <div className={styles.agendaPeriodControls}>
            <div className={styles.agendaViewToggle} aria-label="Modo da agenda">
            <Link
              aria-current={view === "day" ? "page" : undefined}
              className={view === "day" ? styles.navPillActive : styles.navPill}
              href={`/admin/${company.slug}/agenda?view=day&date=${selectedDateKey}`}
            >
              Dia
            </Link>
            <Link
              aria-current={view === "week" ? "page" : undefined}
              className={view === "week" ? styles.navPillActive : styles.navPill}
              href={`/admin/${company.slug}/agenda?view=week&date=${selectedDateKey}`}
            >
              Semana
            </Link>
            <Link
              aria-current={view === "fortnight" ? "page" : undefined}
              className={view === "fortnight" ? styles.navPillActive : styles.navPill}
              href={`/admin/${company.slug}/agenda?view=fortnight&date=${selectedDateKey}`}
            >
              Quinzena
            </Link>
            <Link
              aria-current={view === "month" ? "page" : undefined}
              className={view === "month" ? styles.navPillActive : styles.navPill}
              href={`/admin/${company.slug}/agenda?view=month&date=${selectedDateKey}`}
            >
              Mês
            </Link>
            </div>
            <details className={styles.agendaCalendarJump}>
              <summary>Calendário</summary>
              <form method="get">
                <input name="view" type="hidden" value={view === "period" ? "week" : view} />
                <label>
                  Ir para a data
                  <input defaultValue={selectedDateKey} name="date" required type="date" />
                </label>
                <button type="submit">Abrir</button>
              </form>
            </details>
          </div>
          <div className={styles.agendaNavigation} aria-label="Navegação do período">
            <Link
            className={styles.secondaryButton}
            href={`/admin/${company.slug}/agenda?view=${view}&date=${toDateKey(previousStart)}`}
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
            href={`/admin/${company.slug}/agenda?view=${view}&date=${toDateKey(nextStart)}`}
          >
            Próximo
            </Link>
          </div>
          <div className={styles.agendaPrimaryActions}>
            <Link
            className={styles.primaryButtonLink}
            href={`/admin/${company.slug}/agenda/novo?date=${selectedDateKey}`}
          >
            + Novo treino
            </Link>
            <Link className={styles.secondaryButton} href={`/admin/${company.slug}/treinos`}>
              Biblioteca de treinos
            </Link>
          </div>
        </div>
      </section>

      <section className={styles.agendaWorkspace}>
        <aside className={styles.agendaSidebar}>
          <div className={styles.agendaMiniCalendar}>
            <span className={styles.agendaSidebarIcon} aria-hidden="true">◈</span>
            <div>
              <strong>{monthTitleFormatter.format(monthStart)}</strong>
              <small>{periodLabel}</small>
            </div>
          </div>
          <form className={styles.agendaFilterForm} method="get">
            <input name="date" type="hidden" value={selectedDateKey} />
            <input name="view" type="hidden" value={view === "period" ? "week" : view} />
            <label>
              Treinador
              <select defaultValue={coachFilter} name="coach">
                <option value="">Toda a equipe</option>
                {coachNames.map((coachName) => (
                  <option key={coachName} value={coachName}>{coachName}</option>
                ))}
              </select>
            </label>
            <button type="submit">Aplicar filtro</button>
          </form>
          <div className={styles.agendaLegend}>
            <span><i data-tone="published" /> Publicado</span>
            <span><i data-tone="draft" /> A planejar</span>
            <span><i data-tone="cancelled" /> Cancelado</span>
          </div>
          <Link className={styles.agendaGradeLink} href={`/admin/${company.slug}/agenda/grade`}>
            Grade recorrente
          </Link>
        </aside>

        <div className={styles.agendaMainPanel}>
          <div className={styles.agendaStats}>
            <AgendaStat label="Sessões" value={visibleActivities.length} />
            <AgendaStat
              label="Publicadas"
              value={visibleActivities.filter((activity) => activity.status === "published").length}
            />
            <AgendaStat
              label="Canoas alocadas"
              value={visibleActivities.reduce((total, activity) => total + activity.resourceCount, 0)}
            />
            <AgendaStat label="Reservas recentes" value={confirmedBookings.length} />
          </div>

          {view === "month" ? (
            <PeriodAgenda
              activitiesByDate={visibleActivitiesByDate}
              companySlug={company.slug}
              days={period.days}
              selectedDateKey={selectedDateKey}
              selectedDayActivities={selectedDayActivities}
            />
          ) : (
            <TimelineAgenda
              activitiesByDate={visibleActivitiesByDate}
              companySlug={company.slug}
              days={period.days}
              selectedDateKey={selectedDateKey}
            />
          )}
        </div>
      </section>

      <section className={styles.infoBox}>
        <strong>Como a Agenda funciona</strong>
        <p>
          Horários recorrentes aparecem automaticamente no período aberto. Ao
          selecionar uma ocorrência, você pode ajustar a sessão daquele dia e
          vincular o treino sem alterar as demais datas.
        </p>
      </section>
    </AdminShell>
  );
}

function AgendaStat({ label, value }: { label: string; value: number }) {
  return (
    <div className={styles.agendaStat}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

const timelineStartHour = 5;
const timelineEndHour = 21;
const timelineHourHeight = 72;

function getTimelinePosition(activity: AgendaActivity) {
  const [hour, minute] = activity.startTime.split(":").map(Number);
  const rawStart = hour + minute / 60;
  const visibleStart = Math.max(timelineStartHour, rawStart);
  const visibleEnd = Math.min(
    timelineEndHour,
    rawStart + Math.max(activity.durationMinutes, 30) / 60,
  );

  return {
    height: Math.max(44, (visibleEnd - visibleStart) * timelineHourHeight),
    top: (visibleStart - timelineStartHour) * timelineHourHeight,
  };
}

function TimelineAgenda({
  activitiesByDate,
  companySlug,
  days,
  selectedDateKey,
}: {
  activitiesByDate: Map<string, AgendaActivity[]>;
  companySlug: string;
  days: ReturnType<typeof getPeriodDays>;
  selectedDateKey: string;
}) {
  const hours = Array.from(
    { length: timelineEndHour - timelineStartHour + 1 },
    (_, index) => timelineStartHour + index,
  );

  return (
    <section className={styles.agendaTimelineFrame} aria-label="Agenda por horário">
      <div
        className={styles.agendaTimeline}
        style={{
          "--agenda-days": days.length,
          "--agenda-min-width": `${68 + days.length * 146}px`,
        } as CSSProperties}
      >
        <div className={styles.agendaTimelineCorner}>Horário</div>
        {days.map((day) => (
          <Link
            className={`${styles.agendaTimelineDayHead} ${
              day.dateKey === selectedDateKey ? styles.agendaTimelineDayHeadActive : ""
            }`}
            href={`/admin/${companySlug}/agenda?view=day&date=${day.dateKey}`}
            key={day.dateKey}
          >
            <span>{weekdayLabels[day.weekday].slice(0, 3)}</span>
            <strong>{dayNumberFormatter.format(day.date)}</strong>
          </Link>
        ))}

        <div className={styles.agendaTimelineHours}>
          {hours.map((hour) => (
            <span key={hour}>{String(hour).padStart(2, "0")}:00</span>
          ))}
        </div>

        {days.map((day) => {
          const activities = activitiesByDate.get(day.dateKey) ?? [];

          return (
            <div className={styles.agendaTimelineDay} key={day.dateKey}>
              {hours.slice(0, -1).map((hour) => (
                <span className={styles.agendaTimelineHourLine} key={hour} />
              ))}
              {activities.map((activity) => {
                const position = getTimelinePosition(activity);

                return (
                  <Link
                    className={`${styles.agendaTimelineEvent} ${
                      activity.status === "published"
                        ? styles.agendaTimelineEventPublished
                        : activity.status === "cancelled"
                          ? styles.agendaTimelineEventCancelled
                          : styles.agendaTimelineEventDraft
                    }`}
                    href={activity.href}
                    key={activity.id}
                    style={{ height: position.height, top: position.top }}
                  >
                    <strong>{activity.startTime} · {activity.title}</strong>
                    <span>{activity.coachName}</span>
                    <small>{activity.locationName}</small>
                  </Link>
                );
              })}
              {activities.length === 0 ? (
                <Link
                  className={styles.agendaTimelineEmpty}
                  href={`/admin/${companySlug}/agenda/novo?date=${day.dateKey}`}
                >
                  + Criar treino
                </Link>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function PeriodAgenda({
  activitiesByDate,
  companySlug,
  days,
  selectedDateKey,
  selectedDayActivities,
}: {
  activitiesByDate: Map<string, AgendaActivity[]>;
  companySlug: string;
  days: ReturnType<typeof getPeriodDays>;
  selectedDateKey: string;
  selectedDayActivities: AgendaActivity[];
}) {
  return (
    <>
      <section className={styles.agendaMonthGrid} aria-label="Agenda do período">
        {days.map((day) => {
          const activities = activitiesByDate.get(day.dateKey) ?? [];

          return (
            <article
              className={`${styles.agendaMonthCell} ${
                day.currentMonth ? "" : styles.agendaMonthCellMuted
              } ${selectedDateKey === day.dateKey ? styles.agendaMonthCellActive : ""}`}
              key={day.dateKey}
            >
              <Link
                className={styles.agendaMonthDayLink}
                href={`/admin/${companySlug}/agenda?view=month&date=${day.dateKey}#dia-selecionado`}
              >
                <strong>{dayNumberFormatter.format(day.date)}</strong>
                <span>{weekdayLabels[day.weekday].slice(0, 3)}</span>
              </Link>
              <div className={styles.agendaMonthActivities}>
                {activities.slice(0, 3).map((activity) => (
                  <div className={styles.agendaMonthActivity} key={activity.id}>
                    <Link href={activity.href}>
                      <strong>{activity.startTime}</strong>
                      <span>{activity.title}</span>
                    </Link>
                    {activity.trainingTitle && activity.trainingHref ? (
                      <Link
                        className={styles.agendaMonthTrainingLink}
                        href={activity.trainingHref}
                      >
                        {activity.trainingTitle}
                      </Link>
                    ) : (
                      <Link
                        className={styles.agendaMonthTrainingEmpty}
                        href={activity.href}
                      >
                        + Definir treino
                      </Link>
                    )}
                  </div>
                ))}
                {activities.length > 3 ? (
                  <small>+{activities.length - 3} atividades</small>
                ) : null}
              </div>
            </article>
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
    <article className={styles.agendaSessionCard}>
      <span className={styles.baseScheduleTime}>{activity.startTime}</span>
      <span className={styles.baseScheduleMain}>
        <Link className={styles.agendaActivityTitleLink} href={activity.href}>
          {activity.title}
        </Link>
        <small>Treinador: {activity.coachName}</small>
        {activity.trainingTitle && activity.trainingHref ? (
          <Link className={styles.agendaTrainingLink} href={activity.trainingHref}>
            Treino: {activity.trainingTitle}
          </Link>
        ) : (
          <Link className={styles.agendaTrainingEmpty} href={activity.href}>
            + Vincular ou criar treino
          </Link>
        )}
        <small>
          {activity.resourceCount} canoa{activity.resourceCount === 1 ? "" : "s"} ·{" "}
          {activity.durationMinutes || "--"} min
        </small>
      </span>
      <span className={getStatusClass(activity.status)}>
        {getStatusLabel(activity.status)}
      </span>
      <Link className={styles.agendaDetailsLink} href={activity.href}>
        {activity.kind === "projected" ? "Planejar sessão e treino" : "Abrir detalhes"}
      </Link>
    </article>
  );
}
