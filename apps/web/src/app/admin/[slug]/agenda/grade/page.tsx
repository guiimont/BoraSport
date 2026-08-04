import Link from "next/link";

import {
  getCompanyBaseSchedules,
  getCompanyMembers,
  getCompanyResources,
} from "../../../../../lib/saas/queries";
import { getManageAdminContext } from "../../admin-context";
import { AdminShell } from "../../admin-shell";
import styles from "../../admin.module.css";
import {
  formatScheduleTime,
  getOperationalAlerts,
  getPublicSpotsForSchedule,
  weekdayLabels,
} from "./base-schedule-utils";

type BaseSchedulePageProps = {
  params: Promise<{
    slug: string;
  }>;
  searchParams?: Promise<{
    dia?: string;
  }>;
};

export default async function BaseSchedulePage({
  params,
  searchParams,
}: BaseSchedulePageProps) {
  const { slug } = await params;
  const context = await getManageAdminContext(slug);
  const selectedDay = Number((await searchParams)?.dia ?? 1);
  const [schedules, resources, members] = await Promise.all([
    getCompanyBaseSchedules(context.company.id),
    getCompanyResources(context.company.id),
    getCompanyMembers(context.company.id),
  ]);
  const activeCount = schedules.filter((schedule) => schedule.status === "active").length;
  const inactiveCount = schedules.length - activeCount;
  const schedulesByDay = Object.keys(weekdayLabels).map((day) => {
    const weekday = Number(day);

    return {
      schedules: schedules.filter((schedule) => schedule.weekday === weekday),
      weekday,
    };
  });
  const visibleDay = selectedDay >= 1 && selectedDay <= 7 ? selectedDay : 1;
  const visibleSchedules =
    schedulesByDay.find((group) => group.weekday === visibleDay)?.schedules ?? [];

  return (
    <AdminShell
      active="agenda"
      context={context}
      eyebrow="Operação do clube"
      showSessionBar={false}
      subtitle="Modelo semanal usado para organizar turmas, treinadores e canoas antes da publicação."
      title="Grade-base"
    >
      <section className={styles.vesselTopStrip} aria-label="Resumo da grade">
        <p>
          <strong>{schedules.length}</strong> horários
          <span aria-hidden="true"> · </span>
          <strong>{activeCount}</strong> ativos
          <span aria-hidden="true"> · </span>
          <strong>{inactiveCount}</strong> inativos
        </p>
        <Link
          className={styles.primaryButtonLink}
          href={`/admin/${context.company.slug}/agenda/grade/novo`}
        >
          Novo horário
        </Link>
      </section>

      <nav className={styles.dayScroller} aria-label="Dias da semana">
        {Object.entries(weekdayLabels).map(([value, label]) => (
          <Link
            aria-current={visibleDay === Number(value) ? "page" : undefined}
            className={`${styles.dayPill} ${
              visibleDay === Number(value) ? styles.dayPillActive : ""
            }`}
            href={`/admin/${context.company.slug}/agenda/grade?dia=${value}`}
            key={value}
          >
            {label.slice(0, 3)}
          </Link>
        ))}
      </nav>

      <section className={styles.baseScheduleMobileList}>
        <div className={styles.sectionHeadBalanced}>
          <div>
            <p className={styles.eyebrow}>{weekdayLabels[visibleDay]}</p>
            <h2>Horários do dia</h2>
          </div>
          <span className={styles.statusBadge}>
            {visibleSchedules.length} horário{visibleSchedules.length === 1 ? "" : "s"}
          </span>
        </div>

        {visibleSchedules.length > 0 ? (
          <div className={styles.baseScheduleList}>
            {visibleSchedules.map((schedule) => (
              <ScheduleListItem
                key={schedule.id}
                schedule={schedule}
                slug={context.company.slug}
              />
            ))}
          </div>
        ) : (
          <div className={styles.trainingEmptyState}>
            <p className={styles.eyebrow}>Grade-base</p>
            <h2>Nenhum horário neste dia</h2>
            <p>Crie um horário recorrente para organizar a operação semanal.</p>
            <Link
              className={styles.primaryButtonLink}
              href={`/admin/${context.company.slug}/agenda/grade/novo`}
            >
              Novo horário
            </Link>
          </div>
        )}
      </section>

      <section className={styles.weekGrid} aria-label="Semana completa">
        {schedulesByDay.map(({ schedules: daySchedules, weekday }) => (
          <article className={styles.weekDayCard} key={weekday}>
            <div>
              <p className={styles.eyebrow}>{weekdayLabels[weekday]}</p>
              <strong>
                {daySchedules.length} horário{daySchedules.length === 1 ? "" : "s"}
              </strong>
            </div>
            <div className={styles.baseScheduleListCompact}>
              {daySchedules.slice(0, 4).map((schedule) => (
                <ScheduleListItem
                  compact
                  key={schedule.id}
                  schedule={schedule}
                  slug={context.company.slug}
                />
              ))}
              {daySchedules.length > 4 ? (
                <span className={styles.muted}>+{daySchedules.length - 4} horários</span>
              ) : null}
              {daySchedules.length === 0 ? (
                <span className={styles.muted}>Sem horários</span>
              ) : null}
            </div>
          </article>
        ))}
      </section>

      {resources.length === 0 || members.length === 0 ? (
        <section className={styles.infoBox}>
          <strong>Pré-requisitos</strong>
          <p>
            A Grade-base precisa de canoas operacionais e treinadores vinculados
            ao clube para criar horários.
          </p>
        </section>
      ) : null}
    </AdminShell>
  );
}

function ScheduleListItem({
  compact = false,
  schedule,
  slug,
}: {
  compact?: boolean;
  schedule: Awaited<ReturnType<typeof getCompanyBaseSchedules>>[number];
  slug: string;
}) {
  const publicSpots = getPublicSpotsForSchedule(schedule);
  const alerts = getOperationalAlerts(schedule);

  return (
    <Link
      className={`${styles.baseScheduleItem} ${
        compact ? styles.baseScheduleItemCompact : ""
      }`}
      href={`/admin/${slug}/agenda/grade/${schedule.id}`}
    >
      <span className={styles.baseScheduleTime}>
        {formatScheduleTime(schedule.start_time)}
      </span>
      <span className={styles.baseScheduleMain}>
        <strong>{schedule.group_name}</strong>
        <small>
          {schedule.coach?.name || "Treinador"} · {schedule.duration_minutes} min
        </small>
        <small>
          {schedule.resources.length} canoa
          {schedule.resources.length === 1 ? "" : "s"} · {publicSpots} vagas
        </small>
      </span>
      <span className={styles.baseScheduleVessels}>
        {schedule.resources.slice(0, 2).map((item) => (
          <span key={item.resource_id}>{item.resource?.name.slice(0, 1) || "C"}</span>
        ))}
        {schedule.resources.length > 2 ? (
          <span>+{schedule.resources.length - 2}</span>
        ) : null}
      </span>
      <span
        className={
          schedule.status === "active"
            ? styles.vesselStatus_disponivel
            : styles.vesselStatus_inativa
        }
      >
        {schedule.status === "active" ? "Ativo" : "Inativo"}
      </span>
      {alerts.length > 0 ? <em>{alerts.length} alerta</em> : null}
      <span className={styles.vesselDetailsCell}>
        Detalhes <span aria-hidden="true">&gt;</span>
      </span>
    </Link>
  );
}
