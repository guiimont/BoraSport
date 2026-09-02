import Link from "next/link";

import {
  getCompanyBookings,
  getCompanyMembers,
  getCompanyOperationalSessions,
  getCompanyResources,
  getCompanySlots,
} from "../../../lib/saas/queries";
import type { OperationalSession } from "../../../types/saas";
import { ClaimCompanyForm } from "./claim-company-form";
import { getAdminContext } from "./admin-context";
import { AdminShell } from "./admin-shell";
import styles from "./admin.module.css";

type AdminPageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ period?: string }>;
};

type OverviewPeriod = 1 | 7 | 30;

const dateKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "America/Sao_Paulo",
  year: "numeric",
});

const sessionDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  timeZone: "America/Sao_Paulo",
  weekday: "short",
});

function toDateKey(date: Date) {
  return dateKeyFormatter.format(date);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function normalizePeriod(value?: string): OverviewPeriod {
  if (value === "1" || value === "7") return Number(value) as OverviewPeriod;
  return 30;
}

function formatTime(value: string) {
  return value.slice(0, 5);
}

function getSaoPauloTime() {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date());
}

function formatSessionDate(dateKey: string) {
  const label = sessionDateFormatter.format(
    new Date(`${dateKey}T12:00:00-03:00`),
  );
  return label.replace(".", "");
}

function getSessionCapacity(session: OperationalSession) {
  return session.resources.reduce(
    (total, item) => total + (item.resource?.capacity_maxima ?? 0),
    0,
  );
}

function getSessionState(session: OperationalSession) {
  if (session.status === "cancelled") return "Cancelada";
  if (session.status === "draft") return "Rascunho";
  return "Publicada";
}

function StatCard({
  hint,
  label,
  value,
}: {
  hint: string;
  label: string;
  value: number | string;
}) {
  return (
    <article className={styles.statCard}>
      <p>{label}</p>
      <strong>{value}</strong>
      <span className={styles.statHint}>{hint}</span>
    </article>
  );
}

function SessionRow({
  companySlug,
  session,
  showDate = true,
}: {
  companySlug: string;
  session: OperationalSession;
  showDate?: boolean;
}) {
  const training = session.training_plan_version?.training_plan?.title;
  const resourceNames = session.resources
    .map((item) => item.resource?.name)
    .filter(Boolean)
    .join(", ");
  const capacity = getSessionCapacity(session);

  return (
    <Link
      className={styles.overviewSessionRow}
      href={`/admin/${companySlug}/agenda/sessoes/${session.id}`}
    >
      <div className={styles.overviewSessionTime}>
        {showDate ? <span>{formatSessionDate(session.session_date)}</span> : null}
        <strong>{formatTime(session.start_time)}</strong>
      </div>
      <div className={styles.overviewSessionMain}>
        <strong>{session.group_name}</strong>
        <span>{training || "Treino ainda não definido"}</span>
      </div>
      <div className={styles.overviewSessionMeta}>
        <span>{session.coach?.name || "Sem instrutor"}</span>
        <span>{resourceNames || "Sem canoa"}</span>
      </div>
      <div className={styles.overviewSessionStatus}>
        <span>{capacity > 0 ? `${capacity} vagas` : "Capacidade pendente"}</span>
        <em data-status={session.status}>{getSessionState(session)}</em>
      </div>
      <span className={styles.overviewSessionArrow} aria-hidden="true">→</span>
    </Link>
  );
}

export default async function AdminOverviewPage({
  params,
  searchParams,
}: AdminPageProps) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
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

  const period = normalizePeriod(query?.period);
  const now = new Date();
  const todayKey = toDateKey(now);
  const endKey = toDateKey(addDays(now, period - 1));

  const [sessions, slots, bookings, members, resources] = await Promise.all([
    getCompanyOperationalSessions({
      companyId: company.id,
      endDate: endKey,
      startDate: todayKey,
    }),
    getCompanySlots(company.id),
    getCompanyBookings(company.id),
    getCompanyMembers(company.id),
    getCompanyResources(company.id),
  ]);

  const activeSessions = sessions.filter((session) => session.status !== "cancelled");
  const todaySessions = activeSessions.filter(
    (session) => session.session_date === todayKey,
  );
  const currentTime = getSaoPauloTime();
  const upcomingSessions = activeSessions.filter(
    (session) =>
      session.session_date > todayKey ||
      (session.session_date === todayKey && formatTime(session.start_time) >= currentTime),
  );
  const nextSession = upcomingSessions[0] ?? null;
  const sessionsWithTraining = activeSessions.filter(
    (session) => session.training_plan_version_id,
  ).length;
  const trainingCoverage = activeSessions.length
    ? Math.round((sessionsWithTraining / activeSessions.length) * 100)
    : 0;
  const publishedSessions = activeSessions.filter(
    (session) => session.status === "published",
  ).length;
  const visibleSlots = slots.filter((slot) => {
    const key = toDateKey(new Date(slot.start_time));
    return key >= todayKey && key <= endKey;
  });
  const totalCapacity = visibleSlots.reduce(
    (total, slot) => total + slot.spots_total,
    0,
  );
  const totalOccupied = visibleSlots.reduce(
    (total, slot) => total + slot.spots_occupied,
    0,
  );
  const occupancy = totalCapacity
    ? Math.round((totalOccupied / totalCapacity) * 100)
    : 0;
  const visibleSlotIds = new Set(visibleSlots.map((slot) => slot.id));
  const confirmedBookings = bookings.filter(
    (booking) =>
      visibleSlotIds.has(booking.slot_id) &&
      (booking.status === "confirmed" || booking.status === "attended"),
  ).length;

  const operationalAlerts = activeSessions.flatMap((session) => {
    const issues: Array<{ label: string; type: string }> = [];
    if (company.organization_kind === "club" && !session.training_plan_version_id) {
      issues.push({ label: "Treino não definido", type: "training" });
    }
    if (company.organization_kind === "club" && !session.coach) {
      issues.push({ label: "Instrutor não definido", type: "coach" });
    }
    if (company.organization_kind === "club" && session.resources.length === 0) {
      issues.push({ label: `${vocabulary.resource_label} não definida`, type: "resource" });
    }
    if (session.status === "draft") {
      issues.push({ label: "Sessão em rascunho", type: "draft" });
    }
    return issues.map((issue) => ({ ...issue, session }));
  });

  return (
    <AdminShell
      active="overview"
      context={context}
      eyebrow={company.organization_kind === "club" ? "Mahana · Agenda Imediata" : "Pupu Grupo · Início"}
      subtitle={company.organization_kind === "club" ? "Acompanhe saídas, canoas e check-ins que exigem atenção agora." : "Acompanhe a agenda, as pessoas e as remadas do coletivo."}
      title={company.organization_kind === "club" ? "Operação de hoje" : "Visão do grupo"}
    >
      <section className={styles.overviewControlBar}>
        <div>
          <p className={styles.eyebrow}>Painel operacional</p>
          <strong>O que está acontecendo no clube</strong>
        </div>
        <nav className={styles.overviewPeriodNav} aria-label="Período dos indicadores">
          {[
            { label: "Hoje", value: 1 },
            { label: "7 dias", value: 7 },
            { label: "30 dias", value: 30 },
          ].map((option) => (
            <Link
              aria-current={period === option.value ? "page" : undefined}
              className={period === option.value ? styles.overviewPeriodActive : ""}
              href={`/admin/${company.slug}?period=${option.value}`}
              key={option.value}
            >
              {option.label}
            </Link>
          ))}
        </nav>
      </section>

      <section className={styles.overviewHero}>
        <div className={styles.overviewHeroMain}>
          <p className={styles.eyebrow}>Próxima atividade</p>
          {nextSession ? (
            <>
              <div className={styles.overviewHeroTitle}>
                <strong>{formatTime(nextSession.start_time)}</strong>
                <div>
                  <h2>{nextSession.group_name}</h2>
                  <p>{formatSessionDate(nextSession.session_date)}</p>
                </div>
              </div>
              {company.organization_kind === "club" ? <div className={styles.overviewHeroDetails}>
                <span>
                  <small>Treino</small>
                  <strong>
                    {nextSession.training_plan_version?.training_plan?.title || "Não definido"}
                  </strong>
                </span>
                <span>
                  <small>Instrutor</small>
                  <strong>{nextSession.coach?.name || "Não definido"}</strong>
                </span>
                <span>
                  <small>Canoa</small>
                  <strong>
                    {nextSession.resources
                      .map((item) => item.resource?.name)
                      .filter(Boolean)
                      .join(", ") || "Não definida"}
                  </strong>
                </span>
              </div> : null}
              <Link
                className={styles.overviewHeroLink}
                href={`/admin/${company.slug}/agenda/sessoes/${nextSession.id}`}
              >
                Abrir atividade <span aria-hidden="true">→</span>
              </Link>
            </>
          ) : (
            <div className={styles.overviewEmptyHero}>
              <h2>Nenhuma atividade planejada</h2>
              <p>Crie a próxima atividade para organizar treino, instrutor e canoa.</p>
              <Link
                className={styles.primaryButtonLink}
                href={`/admin/${company.slug}/agenda/novo?date=${todayKey}`}
              >
                Criar atividade
              </Link>
            </div>
          )}
        </div>

        <aside className={styles.overviewToday}>
          <div className={styles.overviewTodayHead}>
            <div>
              <p className={styles.eyebrow}>Hoje</p>
              <strong>{todaySessions.length} atividades</strong>
            </div>
            <Link href={`/admin/${company.slug}/agenda?date=${todayKey}&view=week`}>
              Ver agenda
            </Link>
          </div>
          <div className={styles.overviewTodayList}>
            {todaySessions.length ? (
              todaySessions.slice(0, 4).map((session) => (
                <Link
                  href={`/admin/${company.slug}/agenda/sessoes/${session.id}`}
                  key={session.id}
                >
                  <strong>{formatTime(session.start_time)}</strong>
                  <span>
                    {session.group_name}
                    <small>
                      {session.training_plan_version?.training_plan?.title || "Sem treino"}
                    </small>
                  </span>
                  <em data-status={session.status}>{getSessionState(session)}</em>
                </Link>
              ))
            ) : (
              <p>Nenhuma atividade para hoje.</p>
            )}
          </div>
        </aside>
      </section>

      <section className={styles.statGrid} aria-label="Indicadores operacionais">
        <StatCard
          hint={`${publishedSessions} publicadas`}
          label="Atividades"
          value={activeSessions.length}
        />
        {company.organization_kind === "club" ? <StatCard
          hint={`${sessionsWithTraining} de ${activeSessions.length} atividades`}
          label="Treinos planejados"
          value={`${trainingCoverage}%`}
        /> : null}
        <StatCard
          hint={`${totalOccupied} de ${totalCapacity || 0} vagas`}
          label="Ocupação"
          value={`${occupancy}%`}
        />
        <StatCard
          hint={`${members.length} remadores vinculados`}
          label="Reservas ativas"
          value={confirmedBookings}
        />
      </section>

      <section className={styles.overviewMainGrid}>
        <article className={styles.panel}>
          <div className={styles.sectionHead}>
            <div>
              <p className={styles.eyebrow}>Próximas atividades</p>
              <h2>Agenda resumida</h2>
            </div>
            <Link className={styles.overviewTextLink} href={`/admin/${company.slug}/agenda`}>
              Abrir agenda →
            </Link>
          </div>
          <div className={styles.overviewSessionList}>
            {upcomingSessions.length ? (
              upcomingSessions.slice(0, 6).map((session) => (
                <SessionRow companySlug={company.slug} key={session.id} session={session} />
              ))
            ) : (
              <p className={styles.overviewEmpty}>Nenhuma próxima atividade neste período.</p>
            )}
          </div>
        </article>

        <article className={styles.panel}>
          <div className={styles.sectionHead}>
            <div>
              <p className={styles.eyebrow}>Alertas operacionais</p>
              <h2>Exige atenção</h2>
            </div>
            <span className={styles.overviewAlertCount}>{operationalAlerts.length}</span>
          </div>
          <div className={styles.overviewAlertList}>
            {operationalAlerts.length ? (
              operationalAlerts.slice(0, 7).map(({ label, session, type }, index) => (
                <Link
                  href={`/admin/${company.slug}/agenda/sessoes/${session.id}`}
                  key={`${session.id}:${type}:${index}`}
                >
                  <span className={styles.overviewAlertIcon}>!</span>
                  <span>
                    <strong>{label}</strong>
                    <small>
                      {formatSessionDate(session.session_date)} · {formatTime(session.start_time)} · {session.group_name}
                    </small>
                  </span>
                  <span aria-hidden="true">→</span>
                </Link>
              ))
            ) : (
              <div className={styles.overviewAllGood}>
                <strong>Operação em dia</strong>
                <p>Nenhuma atividade do período exige ajuste.</p>
              </div>
            )}
          </div>
        </article>
      </section>

      <section className={styles.overviewQuickSection}>
        <div>
          <p className={styles.eyebrow}>Ações rápidas</p>
          <h2>Resolva sem procurar no menu</h2>
        </div>
        <div className={styles.overviewQuickGrid}>
          <Link href={`/admin/${company.slug}/agenda/novo?date=${todayKey}`}>
            <span>＋</span><strong>Criar atividade</strong><small>Planejar data, horário e turma</small>
          </Link>
          {company.organization_kind === "club" ? <Link href={`/admin/${company.slug}/treinos/novo`}>
            <span>⌁</span><strong>Criar treino</strong><small>Adicionar à Biblioteca</small>
          </Link> : null}
          <Link href={`/admin/${company.slug}/remadores#convidar-remador`}>
            <span>◎</span><strong>Convidar remador</strong><small>Vincular ao clube</small>
          </Link>
          {company.organization_kind === "club" ? <Link href={`/admin/${company.slug}/canoas#cadastrar-canoa`}>
            <span>◇</span><strong>Cadastrar {vocabulary.resource_label.toLowerCase()}</strong><small>{resources.length} ativas no clube</small>
          </Link> : null}
        </div>
      </section>
    </AdminShell>
  );
}
