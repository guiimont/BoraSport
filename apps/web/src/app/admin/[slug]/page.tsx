import Link from "next/link";

import {
  getCompanyBookings,
  getCompanyOperationalSessions,
  getCompanySlots,
} from "../../../lib/saas/queries";
import type { OperationalSession } from "../../../types/saas";
import { ClaimCompanyForm } from "./claim-company-form";
import { getAdminContext } from "./admin-context";
import { AdminShell } from "./admin-shell";
import styles from "./admin.module.css";

type AdminPageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ date?: string }>;
};

const dateKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo", year: "numeric",
});
const rangeFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "numeric", month: "long", timeZone: "America/Sao_Paulo",
});
const weekdayFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo", weekday: "long",
});

function toDateKey(date: Date) {
  return dateKeyFormatter.format(date);
}

function parseDate(value?: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${toDateKey(new Date())}T12:00:00-03:00`);
  }
  const parsed = new Date(`${value}T12:00:00-03:00`);
  return Number.isNaN(parsed.getTime())
    ? new Date(`${toDateKey(new Date())}T12:00:00-03:00`)
    : parsed;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function getWeekStart(date: Date) {
  const start = new Date(date);
  const weekday = start.getDay();
  start.setDate(start.getDate() + (weekday === 0 ? -6 : 1 - weekday));
  return start;
}

function getCapacity(session: OperationalSession) {
  return session.resources.reduce(
    (total, item) => total + (item.resource?.capacity_maxima ?? 0), 0,
  );
}

export default async function AdminOverviewPage({ params, searchParams }: AdminPageProps) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const context = await getAdminContext(slug);
  const { company } = context;

  if (!context.canManageTenant) {
    return (
      <main className={styles.page}>
        <section className={styles.claimPanel}>
          <p className={styles.eyebrow}>Primeiro administrador</p>
          <h1>{company.name}</h1>
          <p className={styles.muted}>
            Este clube ainda não tem membros. Assuma o clube para organizar a agenda.
          </p>
          <ClaimCompanyForm companyId={company.id} slug={company.slug} />
        </section>
      </main>
    );
  }

  const selectedDate = parseDate(query?.date);
  const weekStart = getWeekStart(selectedDate);
  const weekEnd = addDays(weekStart, 6);
  const startKey = toDateKey(weekStart);
  const endKey = toDateKey(weekEnd);
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(weekStart, index);
    return { date, key: toDateKey(date) };
  });

  const [sessions, slots, bookings] = await Promise.all([
    getCompanyOperationalSessions({
      companyId: company.id, endDate: endKey, startDate: startKey,
    }),
    getCompanySlots(company.id),
    getCompanyBookings(company.id),
  ]);

  const activeSessions = sessions.filter((session) => session.status !== "cancelled");
  const sessionSlots = new Map(
    slots.filter((slot) => slot.operational_session_id)
      .map((slot) => [slot.operational_session_id as string, slot]),
  );
  const bookingsBySlot = new Map<string, { confirmed: number; waitlisted: number }>();

  for (const booking of bookings) {
    const current = bookingsBySlot.get(booking.slot_id) ?? { confirmed: 0, waitlisted: 0 };
    if (booking.status === "confirmed" || booking.status === "attended") current.confirmed += 1;
    if (booking.status === "waitlisted") current.waitlisted += 1;
    bookingsBySlot.set(booking.slot_id, current);
  }

  const sessionsByDay = new Map<string, OperationalSession[]>();
  for (const session of activeSessions) {
    const list = sessionsByDay.get(session.session_date) ?? [];
    list.push(session);
    sessionsByDay.set(session.session_date, list);
  }

  const publishedCount = activeSessions.filter((session) => session.status === "published").length;
  const reservations = activeSessions.reduce((total, session) => {
    const slot = sessionSlots.get(session.id);
    return total + (slot ? bookingsBySlot.get(slot.id)?.confirmed ?? 0 : 0);
  }, 0);
  const waiting = activeSessions.reduce((total, session) => {
    const slot = sessionSlots.get(session.id);
    return total + (slot ? bookingsBySlot.get(slot.id)?.waitlisted ?? 0 : 0);
  }, 0);

  return (
    <AdminShell
      active="overview"
      context={context}
      eyebrow="Agenda do clube"
      subtitle="Veja a semana, abra um treino e resolva a operação sem procurar em outros menus."
      title="Agenda"
    >
      <section className={styles.homeAgendaToolbar}>
        <div>
          <p className={styles.eyebrow}>Semana</p>
          <h2>{rangeFormatter.format(weekStart)} a {rangeFormatter.format(weekEnd)}</h2>
          <p>Treinos, canoas, ocupação e fila em uma única visão.</p>
        </div>
        <div className={styles.homeAgendaActions}>
          <nav aria-label="Navegação da semana">
            <Link href={`/admin/${company.slug}?date=${toDateKey(addDays(weekStart, -7))}`}>
              ← Anterior
            </Link>
            <Link href={`/admin/${company.slug}`}>Hoje</Link>
            <Link href={`/admin/${company.slug}?date=${toDateKey(addDays(weekStart, 7))}`}>
              Próxima →
            </Link>
          </nav>
          <Link className={styles.primaryButtonLink}
            href={`/admin/${company.slug}/agenda/novo?date=${startKey}`}>
            + Novo horário
          </Link>
        </div>
      </section>

      <section className={styles.homeAgendaSummary} aria-label="Resumo da semana">
        <span><strong>{activeSessions.length}</strong> treinos</span>
        <span><strong>{publishedCount}</strong> publicados</span>
        <span><strong>{reservations}</strong> reservas</span>
        {waiting > 0 ? <span data-alert="true"><strong>{waiting}</strong> na fila</span> : null}
        <Link href={`/admin/${company.slug}/agenda?date=${startKey}&view=week`}>
          Ver agenda completa →
        </Link>
      </section>

      <section className={styles.homeWeekBoard} aria-label="Agenda semanal">
        {days.map(({ date, key }) => {
          const daySessions = sessionsByDay.get(key) ?? [];
          const isToday = key === toDateKey(new Date());

          return (
            <article className={styles.homeDayColumn} data-today={isToday} key={key}>
              <header>
                <span>{weekdayFormatter.format(date).replace("-feira", "")}</span>
                <strong>{date.getDate().toString().padStart(2, "0")}</strong>
              </header>
              <div className={styles.homeDaySessions}>
                {daySessions.length ? daySessions.map((session) => {
                  const slot = sessionSlots.get(session.id);
                  const capacity = slot?.spots_total ?? getCapacity(session);
                  const counts = slot
                    ? bookingsBySlot.get(slot.id) ?? { confirmed: 0, waitlisted: 0 }
                    : { confirmed: 0, waitlisted: 0 };
                  const remaining = Math.max(capacity - counts.confirmed, 0);
                  const canoe = session.resources.map((item) => item.resource?.name)
                    .filter(Boolean).join(", ");

                  return (
                    <Link className={styles.homeSessionCard}
                      href={`/admin/${company.slug}/agenda/sessoes/${session.id}`}
                      key={session.id}>
                      <div className={styles.homeSessionTopline}>
                        <strong>{session.start_time.slice(0, 5)}</strong>
                        <span>{session.duration_minutes} min</span>
                      </div>
                      <h3>{session.group_name}</h3>
                      <p>{canoe || "Canoa a definir"}</p>
                      <div className={styles.homeSessionOccupancy}>
                        <span>{counts.confirmed}/{capacity || "–"} confirmados</span>
                        <span>{remaining} vagas</span>
                      </div>
                      {counts.waitlisted > 0 ? (
                        <div className={styles.homeSessionWaitlist}>
                          {counts.waitlisted} na fila de espera
                        </div>
                      ) : null}
                      <div className={styles.homeSessionOpen}>
                        Abrir canoa e participantes <span aria-hidden="true">→</span>
                      </div>
                    </Link>
                  );
                }) : (
                  <div className={styles.homeDayEmpty}>
                    <strong>Dia livre</strong>
                    <span>Nenhum treino marcado.</span>
                  </div>
                )}
              </div>
              <Link className={styles.homeDayAdd}
                href={`/admin/${company.slug}/agenda/novo?date=${key}`}>
                + Criar horário
              </Link>
            </article>
          );
        })}
      </section>
    </AdminShell>
  );
}
