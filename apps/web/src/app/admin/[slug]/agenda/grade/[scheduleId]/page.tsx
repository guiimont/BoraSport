import Link from "next/link";
import { notFound } from "next/navigation";

import {
  getCompanyBaseScheduleById,
  getCompanyBaseSchedules,
  getCompanyMembers,
  getCompanyResources,
} from "../../../../../../lib/saas/queries";
import { getManageAdminContext } from "../../../admin-context";
import { AdminShell } from "../../../admin-shell";
import styles from "../../../admin.module.css";
import { BaseScheduleForm } from "../base-schedule-form";
import {
  formatScheduleTime,
  getOperationalAlerts,
  getPublicSpotsForResource,
  getPublicSpotsForSchedule,
  getResourceStatus,
  steererPolicyLabels,
  vesselLabels,
  vesselStatusLabels,
  weekdayLabels,
} from "../base-schedule-utils";
import { BaseScheduleStatusAction } from "./status-action";

type BaseScheduleDetailPageProps = {
  params: Promise<{
    scheduleId: string;
    slug: string;
  }>;
};

export default async function BaseScheduleDetailPage({
  params,
}: BaseScheduleDetailPageProps) {
  const { scheduleId, slug } = await params;
  const context = await getManageAdminContext(slug);
  const [schedule, resources, members, existingSchedules] = await Promise.all([
    getCompanyBaseScheduleById(context.company.id, scheduleId),
    getCompanyResources(context.company.id),
    getCompanyMembers(context.company.id),
    getCompanyBaseSchedules(context.company.id),
  ]);

  if (!schedule) {
    notFound();
  }

  const publicSpots = getPublicSpotsForSchedule(schedule);
  const alerts = getOperationalAlerts(schedule);
  const duplicateHref = `/admin/${context.company.slug}/agenda/grade/novo?duplicar=${schedule.id}`;

  return (
    <AdminShell
      active="agenda"
      context={context}
      eyebrow="Horário da grade"
      showSessionBar={false}
      subtitle="Revise turma, treinador, canoas vinculadas e alertas antes de publicar sessões futuras."
      title={schedule.group_name}
    >
      <div className={styles.backRow}>
        <Link
          className={styles.secondaryButton}
          href={`/admin/${context.company.slug}/agenda/grade`}
        >
          Voltar para grade
        </Link>
      </div>

      <section className={styles.overviewHero}>
        <div>
          <p className={styles.eyebrow}>{weekdayLabels[schedule.weekday]}</p>
          <h2>
            {formatScheduleTime(schedule.start_time)} · {schedule.group_name}
          </h2>
          <p>
            {schedule.coach?.name || "Treinador"} · {schedule.duration_minutes}{" "}
            min · {schedule.resources.length} canoa
            {schedule.resources.length === 1 ? "" : "s"} · {publicSpots} vagas
            públicas.
          </p>
          {alerts.length > 0 ? (
            <div className={styles.baseAlertList}>
              {alerts.map((alert) => (
                <span key={alert}>{alert}</span>
              ))}
            </div>
          ) : null}
        </div>
        <div className={styles.quickActions}>
          <Link className={styles.secondaryButton} href={duplicateHref}>
            Duplicar
          </Link>
          <BaseScheduleStatusAction
            companyId={context.company.id}
            scheduleId={schedule.id}
            slug={context.company.slug}
            status={schedule.status === "active" ? "inactive" : "active"}
          />
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.sectionHeadBalanced}>
          <div>
            <p className={styles.eyebrow}>Canoas vinculadas</p>
            <h2>Capacidade operacional</h2>
          </div>
          <span className={styles.statusBadge}>{publicSpots} vagas públicas</span>
        </div>
        <div className={styles.baseVesselDetailGrid}>
          {schedule.resources.map((item) => {
            const resource = item.resource;

            if (!resource) {
              return null;
            }

            const status = getResourceStatus(resource);
            const vesselClass = resource.vessel_class
              ? vesselLabels[resource.vessel_class]
              : "Classe não definida";

            return (
              <article className={styles.baseVesselDetailCard} key={item.resource_id}>
                <span className={styles.vesselAvatar} aria-hidden="true">
                  {resource.name.slice(0, 1)}
                </span>
                <div>
                  <strong>{resource.name}</strong>
                  <p>
                    {vesselClass} · capacidade {resource.capacity_maxima} ·{" "}
                    {getPublicSpotsForResource(resource)} vagas públicas
                  </p>
                  <p>
                    {resource.default_steerer_policy
                      ? steererPolicyLabels[resource.default_steerer_policy]
                      : "Leme não se aplica"}
                  </p>
                  <span
                    className={
                      status === "disponivel"
                        ? styles.vesselStatus_disponivel
                        : status === "manutencao"
                          ? styles.vesselStatus_manutencao
                          : styles.vesselStatus_inativa
                    }
                  >
                    {vesselStatusLabels[status]}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <BaseScheduleForm
        companyId={context.company.id}
        existingSchedules={existingSchedules}
        members={members}
        resources={resources}
        schedule={schedule}
        slug={context.company.slug}
      />
    </AdminShell>
  );
}
