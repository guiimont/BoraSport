import Link from "next/link";
import { redirect } from "next/navigation";

import { MemberShell } from "../../components/ui";
import {
  getCurrentProfile,
  getCurrentUser,
  getCurrentUserActivityRecords,
  getCurrentUserMemberships,
  getCurrentUserWeekSessions,
} from "../../lib/saas/queries";
import styles from "../athlete-hub.module.css";

const number = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
const date = new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeZone: "America/Sao_Paulo" });
const weekDay = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  timeZone: "UTC",
  weekday: "short",
});

export default async function CommunityPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/comunidade");

  const [profile, activities, memberships, weekSessions] = await Promise.all([
    getCurrentProfile(),
    getCurrentUserActivityRecords(),
    getCurrentUserMemberships(),
    getCurrentUserWeekSessions(),
  ]);
  const distance = activities.reduce((total, activity) => total + (activity.distance_meters ?? 0), 0);
  const validated = activities.filter((activity) => activity.attendance_validation_status === "validated").length;

  return (
    <MemberShell
      active="amuiraa"
      company={memberships[0]?.companies ?? null}
      context="Área do remador"
      description="Seus próximos treinos, clubes e atividades sem complicação."
      greetingName={profile?.name?.split(" ")[0] ?? null}
      title="Hoje"
    >
      <div className={styles.grid}>
        <section className={styles.panel}>
          <p className={styles.eyebrow}>Próximos treinos</p>
          <h2>Sua semana no clube</h2>
          {weekSessions.length ? (
            <ol className={styles.nextSessions}>
              {weekSessions.slice(0, 4).map((session) => (
                <li key={session.id}>
                  <div>
                    <strong>{weekDay.format(new Date(`${session.session_date}T12:00:00Z`))}</strong>
                    <span>{session.start_time.slice(0, 5)}</span>
                  </div>
                  <section>
                    <strong>{session.training_plan_version?.training_plan?.title ?? session.group_name}</strong>
                    <span>{session.company_name} · {session.duration_minutes} min</span>
                  </section>
                </li>
              ))}
            </ol>
          ) : (
            <div className={styles.empty}>Nenhum treino publicado para esta semana.</div>
          )}

          <div className={styles.summaryHeading}>
            <p className={styles.eyebrow}>Seu resumo</p>
            <Link href="/remadas">Ver atividades →</Link>
          </div>
          <div className={styles.stats}>
            <article className={styles.stat}><strong>{activities.length}</strong><span>atividades registradas</span></article>
            <article className={styles.stat}><strong>{number.format(distance / 1000)} km</strong><span>distância acumulada</span></article>
            <article className={styles.stat}><strong>{validated}</strong><span>presenças auditadas</span></article>
          </div>

          <ol className={styles.feed}>
            {activities.slice(0, 8).map((activity) => (
              <li key={activity.id}>
                <div className={styles.feedHeader}><strong>{activity.title || "Remada"}</strong><span>{date.format(new Date(activity.started_at))}</span></div>
                <p className={styles.feedMeta}>{activity.visibility === "private" ? "Visível somente para você" : "Compartilhada com sua organização"}</p>
                <div className={styles.feedMetrics}>
                  {activity.distance_meters !== null ? <span>{number.format(activity.distance_meters / 1000)} km</span> : null}
                  <span>{activity.attendance_validation_status === "validated" ? "Presença auditada" : "Atividade pessoal"}</span>
                  <span>Trajeto protegido</span>
                </div>
              </li>
            ))}
          </ol>
          {!activities.length ? <div className={styles.empty}>Suas atividades aparecerão aqui depois do primeiro registro ou sincronização.</div> : null}
        </section>

        <aside className={styles.stack}>
          <section className={styles.panel}>
            <div className={styles.privacySeal}><strong>Privacidade ativa</strong><span>Dados de saúde privados e ponto de saída do trajeto oculto.</span></div>
          </section>
          <section className={styles.panel}>
            <p className={styles.eyebrow}>Meus clubes</p>
            <h3>Acessos rápidos</h3>
            <div className={styles.organizationList}>
              {memberships.map((membership) => membership.companies ? (
                <Link className={styles.organizationCard} href={`/clube/${membership.companies.slug}`} key={membership.id}>
                  <span className={styles.organizationMark}>{membership.companies.name.charAt(0)}</span>
                  <div><strong>{membership.companies.name}</strong><span>{membership.companies.organization_kind === "group" ? "Grupo" : "Clube"}</span></div>
                  <em>Acessar →</em>
                </Link>
              ) : null)}
            </div>
          </section>
        </aside>
      </div>
    </MemberShell>
  );
}
