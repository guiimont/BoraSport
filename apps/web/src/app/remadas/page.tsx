import { redirect } from "next/navigation";

import { MemberShell, RahuiSeal } from "../../components/ui";
import {
  getCurrentUser,
  getCurrentUserActivityRecords,
  getCurrentUserMemberships,
  getCurrentUserSessionCandidates,
  getCurrentUserWeekSessions,
} from "../../lib/saas/queries";
import { ActivityForm } from "./activity-form";
import { ActivityFeedbackForm } from "./activity-feedback-form";
import { ActivityMatchForm } from "./activity-match-form";
import styles from "./remadas.module.css";

const number = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
const date = new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeZone: "America/Sao_Paulo" });

function duration(seconds: number | null) {
  if (!seconds) return "—";
  const minutes = Math.round(seconds / 60);
  return minutes >= 60 ? `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}min` : `${minutes}min`;
}

export default async function RemadasPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/remadas");

  const [activities, memberships, sessionCandidates, weekSessions] = await Promise.all([
    getCurrentUserActivityRecords(),
    getCurrentUserMemberships(),
    getCurrentUserSessionCandidates(),
    getCurrentUserWeekSessions(),
  ]);
  const companies = new Map(
    memberships.flatMap((membership) => membership.companies ? [[membership.company_id, membership.companies.name] as const] : []),
  );

  return (
    <MemberShell
      active="hoe"
      company={memberships[0]?.companies ?? null}
      context="Hoe · Diário & Atividades"
      description="Seu histórico pertence a você. Importe do relógio ou registre só o essencial."
      title="Diário de remadas"
    >
      <div className={styles.layout}>
        <section className={`${styles.panel} ${styles.weekPanel}`}>
          <div className={styles.sectionHeading}>
            <div><p className={styles.eyebrow}>Minha semana</p><h2>Treinos publicados</h2></div>
            <span className={styles.weekCount}>{weekSessions.length}</span>
          </div>
          {weekSessions.length ? (
            <ol className={styles.weekList}>
              {weekSessions.map((session) => {
                const plan = session.training_plan_version?.training_plan;
                return (
                  <li key={session.id}>
                    <div className={styles.weekDate}>
                      <strong>{new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit", timeZone: "UTC" }).format(new Date(`${session.session_date}T12:00:00Z`))}</strong>
                      <span>{session.start_time.slice(0, 5)}</span>
                    </div>
                    <div className={styles.weekMain}>
                      <span>{session.company_name} · {session.group_name}</span>
                      <h3>{plan?.title ?? "Sessão sem treino definido"}</h3>
                      <p>{plan?.objective ?? `${session.duration_minutes} min de sessão publicada.`}</p>
                      {session.training_blocks.length ? (
                        <details>
                          <summary>Ver prescrição</summary>
                          <ol>
                            {session.training_blocks
                              .filter((block) => !block.parent_block_id)
                              .sort((a, b) => a.sort_order - b.sort_order)
                              .map((block) => (
                                <li key={block.id}>
                                  <strong>{block.name}</strong>
                                  {block.instruction ? <span>{block.instruction}</span> : null}
                                </li>
                              ))}
                          </ol>
                        </details>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ol>
          ) : (
            <div className={styles.weekEmpty}>
              <strong>Semana livre por enquanto.</strong>
              <span>Os treinos aparecem aqui assim que o clube publicar a sessão.</span>
            </div>
          )}
        </section>

        <section className={styles.panel} id="registrar-remada">
          <ActivityForm memberships={memberships} />
        </section>

        <section className={styles.panel}>
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}>Histórico pessoal</p>
              <h2>{activities.length} remadas</h2>
            </div>
          </div>

          {activities.length ? (
            <ol className={styles.activityList}>
              {activities.map((activity) => (
                <li key={activity.id}>
                  <div className={styles.activityHeading}>
                    <div>
                      <strong>{activity.title || "Remada"}</strong>
                      <span>{date.format(new Date(activity.started_at))}{activity.company_id && companies.get(activity.company_id) ? ` · ${companies.get(activity.company_id)}` : " · Pessoal"}</span>
                    </div>
                    <span className={styles.privacy}>{activity.visibility === "private" ? "Somente eu" : "Organização"}</span>
                  </div>
                  <div className={styles.metrics}>
                    <span><strong>{activity.distance_meters !== null ? `${number.format(activity.distance_meters / 1000)} km` : "—"}</strong>Distância</span>
                    <span><strong>{duration(activity.duration_seconds)}</strong>Duração</span>
                    <span><strong>{activity.average_heart_rate ? `${activity.average_heart_rate} bpm` : "—"}</strong>FC média</span>
                  </div>
                  <div className={styles.activityAudit}>
                    <span data-validated={activity.attendance_validation_status === "validated"}>
                      {activity.attendance_validation_status === "validated"
                        ? "Presença auditada"
                        : "Atividade ainda não vinculada"}
                    </span>
                    <RahuiSeal />
                  </div>
                  {activity.attendance_validation_status !== "validated" && sessionCandidates.length ? (
                    <ActivityMatchForm activityId={activity.id} candidates={sessionCandidates} />
                  ) : null}
                  <ActivityFeedbackForm activity={activity} />
                </li>
              ))}
            </ol>
          ) : (
            <div className={styles.empty}>
              <span aria-hidden>≈</span>
              <h3>O mar chama.</h3>
              <p>Você ainda não registrou atividades esta semana. Conecte seu dispositivo e vá para a água.</p>
            </div>
          )}
        </section>
      </div>
      <a className={styles.fab} href="#registrar-remada">
        <strong>Hoe!</strong>
        <span>Registrar Remada</span>
      </a>
    </MemberShell>
  );
}
