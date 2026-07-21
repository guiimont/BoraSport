import {
  getCompanyBaseSchedules,
  getCompanyBookings,
  getCompanyResources,
  getCompanyServices,
  getCompanySlots,
} from "../../../../lib/saas/queries";
import { formatDateTime, getManageAdminContext } from "../admin-context";
import { AdminShell } from "../admin-shell";
import styles from "../admin.module.css";
import { SlotForm, WeeklySlotsForm } from "../tenant-catalog-forms";

type AdminAgendaPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function AdminAgendaPage({ params }: AdminAgendaPageProps) {
  const { slug } = await params;
  const context = await getManageAdminContext(slug);
  const { company, vocabulary } = context;
  const [resources, services, slots, bookings] = await Promise.all([
    getCompanyResources(company.id),
    getCompanyServices(company.id),
    getCompanySlots(company.id),
    getCompanyBookings(company.id),
  ]);
  const baseSchedules = await getCompanyBaseSchedules(company.id);

  const confirmedBookings = bookings.filter(
    (booking) => booking.status === "confirmed",
  );
  const publishableResources = resources.filter(
    (resource) =>
      resource.vessel_status === null ||
      resource.vessel_status === "disponivel",
  );

  return (
    <AdminShell
      active="agenda"
      context={context}
      subtitle="Publique horários, acompanhe vagas e veja a ocupação recente."
      title="Agenda"
    >
      <section className={styles.statGrid} aria-label="Resumo da agenda">
        <article className={styles.statCard}>
          <p>Horários futuros</p>
          <strong>{slots.length}</strong>
        </article>
        <article className={styles.statCard}>
          <p>Reservas recentes confirmadas</p>
          <strong>{confirmedBookings.length}</strong>
        </article>
        <article className={styles.statCard}>
          <p>Capacidade futura</p>
          <strong>
            {slots.reduce((total, slot) => total + slot.spots_total, 0)}
          </strong>
        </article>
        <article className={styles.statCard}>
          <p>Ocupação futura</p>
          <strong>
            {slots.reduce((total, slot) => total + slot.spots_occupied, 0)}
          </strong>
        </article>
      </section>

      <section className={styles.overviewHero}>
        <div>
          <p className={styles.eyebrow}>Grade-base</p>
          <h2>Modelo semanal da operação</h2>
          <p>
            Organize turmas, treinadores e canoas recorrentes antes de publicar
            sessões na agenda pública.
          </p>
        </div>
        <div className={styles.quickActions}>
          <span className={styles.statusBadge}>
            {baseSchedules.length} horário
            {baseSchedules.length === 1 ? "" : "s"} na grade
          </span>
          <a
            className={styles.primaryButtonLink}
            href={`/admin/${company.slug}/agenda/grade`}
          >
            Abrir Grade-base
          </a>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.sectionHead}>
          <div>
            <p className={styles.eyebrow}>Publicação</p>
            <h2>Abrir vagas na agenda pública</h2>
            <p className={styles.muted}>
              O gestor chega aqui a partir da visão geral para publicar horários
              em um clique.
            </p>
          </div>
        </div>
        <div className={styles.catalogGrid}>
        <SlotForm
          companyId={company.id}
            resources={publishableResources}
            services={services}
            slug={company.slug}
            vocabulary={vocabulary}
          />
        <WeeklySlotsForm
          companyId={company.id}
            resources={publishableResources}
            services={services}
            slug={company.slug}
            vocabulary={vocabulary}
          />
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.sectionHead}>
          <div>
            <p className={styles.eyebrow}>Agenda publicada</p>
            <h2>Próximos horários</h2>
          </div>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Horário</th>
                <th>{vocabulary.service_label}</th>
                <th>{vocabulary.resource_label}</th>
                <th>Ocupação</th>
              </tr>
            </thead>
            <tbody>
              {slots.map((slot) => (
                <tr key={slot.id}>
                  <td>{formatDateTime(slot.start_time)}</td>
                  <td>{slot.services?.name || "--"}</td>
                  <td>{slot.resources?.name || "--"}</td>
                  <td>
                    {slot.spots_occupied}/{slot.spots_total}
                  </td>
                </tr>
              ))}
              {slots.length === 0 ? (
                <tr>
                  <td className={styles.emptyCell} colSpan={4}>
                    Nenhum horário futuro publicado.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </AdminShell>
  );
}
