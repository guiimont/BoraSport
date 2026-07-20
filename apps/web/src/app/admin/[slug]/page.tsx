import Link from "next/link";

import {
  getCompanyBookings,
  getCompanyInvitations,
  getCompanyLandingPage,
  getCompanyMembers,
  getCompanyResources,
  getCompanyServices,
  getCompanySlots,
  getCompanyTrainingLibrary,
} from "../../../lib/saas/queries";
import { ClaimCompanyForm } from "./claim-company-form";
import { formatDateTime, getAdminContext } from "./admin-context";
import { AdminShell } from "./admin-shell";
import styles from "./admin.module.css";

type AdminPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

function StatCard({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <article className={styles.statCard}>
      <p>{label}</p>
      <strong>{value}</strong>
    </article>
  );
}

function getPendingInvitations(
  invitations: Awaited<ReturnType<typeof getCompanyInvitations>>,
) {
  const now = Date.now();

  return invitations.filter(
    (invitation) =>
      !invitation.used_at &&
      !invitation.revoked_at &&
      new Date(invitation.expires_at).getTime() > now,
  ).length;
}

export default async function AdminOverviewPage({ params }: AdminPageProps) {
  const { slug } = await params;
  const context = await getAdminContext(slug);
  const { company, vocabulary } = context;

  if (!context.canManageTenant) {
    return (
      <main className={styles.page}>
        <section className={styles.claimPanel}>
          <p className={styles.eyebrow}>Primeiro administrador</p>
          <h1>{company.name}</h1>
          <p className={styles.muted}>
            Este clube ainda não tem membros. Para operar o painel, assuma o
            clube com sua conta autenticada.
          </p>

          <ClaimCompanyForm companyId={company.id} slug={company.slug} />
        </section>
      </main>
    );
  }

  const [
    resources,
    services,
    slots,
    bookings,
    landingPage,
    invitations,
    members,
    trainingPlans,
  ] = await Promise.all([
      getCompanyResources(company.id),
      getCompanyServices(company.id),
      getCompanySlots(company.id),
      getCompanyBookings(company.id),
      getCompanyLandingPage(company.id),
      getCompanyInvitations(company.id),
      getCompanyMembers(company.id),
      getCompanyTrainingLibrary(company.id),
    ]);

  const nextSlot = slots[0] ?? null;
  const futureCapacity = slots.reduce((total, slot) => total + slot.spots_total, 0);
  const futureOccupied = slots.reduce(
    (total, slot) => total + slot.spots_occupied,
    0,
  );
  const occupancy =
    futureCapacity > 0 ? Math.round((futureOccupied / futureCapacity) * 100) : 0;
  const confirmedBookings = bookings.filter(
    (booking) => booking.status === "confirmed",
  ).length;
  const pendingInvitations = getPendingInvitations(invitations);
  const alerts = [
    resources.length === 0
      ? `Cadastre pelo menos uma ${vocabulary.resource_label.toLowerCase()}.`
      : null,
    services.length === 0
      ? `Crie pelo menos um ${vocabulary.service_label.toLowerCase()}.`
      : null,
    slots.length === 0 ? "Nenhum horário futuro publicado." : null,
    landingPage?.is_published ? null : "Site do clube ainda não publicado.",
  ].filter((alert): alert is string => Boolean(alert));

  return (
    <AdminShell
      active="overview"
      context={context}
      subtitle="Resumo operacional para administrar agenda, remadores, canoas, treinos e site do clube."
      title="Visão geral"
    >
      <section className={styles.overviewHero}>
        <div>
          <p className={styles.eyebrow}>Próximo treino</p>
          {nextSlot ? (
            <>
              <h2>{nextSlot.services?.name || vocabulary.service_label}</h2>
              <p className={styles.muted}>
                {formatDateTime(nextSlot.start_time)} ·{" "}
                {nextSlot.resources?.name || vocabulary.resource_label} ·{" "}
                {nextSlot.spots_occupied}/{nextSlot.spots_total} confirmados
              </p>
            </>
          ) : (
            <>
              <h2>Agenda em montagem</h2>
              <p className={styles.muted}>
                Publique o primeiro horário para os remadores visualizarem a
                agenda pública.
              </p>
            </>
          )}
        </div>

        <div className={styles.quickActions}>
          <Link
            className={styles.primaryButtonLink}
            href={`/admin/${company.slug}/agenda#publicar-horario`}
          >
            Publicar horário
          </Link>
          <Link
            className={styles.secondaryButton}
            href={`/admin/${company.slug}/remadores#convidar-remador`}
          >
            Convidar remador
          </Link>
          <Link
            className={styles.secondaryButton}
            href={`/admin/${company.slug}/canoas#cadastrar-canoa`}
          >
            Cadastrar {vocabulary.resource_label.toLowerCase()}
          </Link>
          <Link
            className={styles.secondaryButton}
            href={`/admin/${company.slug}/treinos/novo`}
          >
            Novo treino
          </Link>
        </div>
      </section>

      <section className={styles.statGrid} aria-label="Resumo do clube">
        <StatCard label="Horários futuros" value={slots.length} />
        <StatCard label="Ocupação futura" value={`${occupancy}%`} />
        <StatCard label="Reservas recentes" value={confirmedBookings} />
        <StatCard label="Remadores vinculados" value={members.length} />
        <StatCard label={`${vocabulary.resource_label}s ativos`} value={resources.length} />
        <StatCard label="Treinos estruturados" value={trainingPlans.length} />
        <StatCard label="Convites pendentes" value={pendingInvitations} />
        <StatCard
          label="Site do clube"
          value={landingPage?.is_published ? "Publicado" : "Rascunho"}
        />
      </section>

      <section className={styles.moduleGrid}>
        <Link className={styles.moduleCardLink} href={`/admin/${company.slug}/agenda`}>
          <strong>Agenda</strong>
          <p>Horários, capacidade, reservas existentes e publicação rápida.</p>
          <span className={styles.moduleStatusActive}>Ativo</span>
        </Link>
        <Link
          className={styles.moduleCardLink}
          href={`/admin/${company.slug}/remadores`}
        >
          <strong>Remadores</strong>
          <p>Vínculos do clube e convites individuais de acesso.</p>
          <span className={styles.moduleStatusActive}>Ativo</span>
        </Link>
        <Link className={styles.moduleCardLink} href={`/admin/${company.slug}/canoas`}>
          <strong>Canoas</strong>
          <p>Canoas disponíveis, capacidade e base da lotação.</p>
          <span className={styles.moduleStatusReady}>Base pronta</span>
        </Link>
        <Link className={styles.moduleCardLink} href={`/admin/${company.slug}/site`}>
          <strong>Site</strong>
          <p>Landing pública, imagem principal, CTA e publicação.</p>
          <span
            className={
              landingPage?.is_published
                ? styles.moduleStatusActive
                : styles.moduleStatusReady
            }
          >
            {landingPage?.is_published ? "Publicado" : "Base pronta"}
          </span>
        </Link>
      </section>

      <section className={styles.panel}>
        <div className={styles.sectionHead}>
          <div>
            <p className={styles.eyebrow}>Alertas operacionais</p>
            <h2>O que precisa de atenção</h2>
          </div>
        </div>
        <div className={styles.list}>
          {alerts.length > 0 ? (
            alerts.map((alert) => (
              <p className={styles.empty} key={alert}>
                {alert}
              </p>
            ))
          ) : (
            <p className={styles.empty}>
              Estrutura mínima cadastrada. Acompanhe a ocupação dos próximos
              horários.
            </p>
          )}
        </div>
      </section>
    </AdminShell>
  );
}
