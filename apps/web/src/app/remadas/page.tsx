import { redirect } from "next/navigation";

import { MemberShell } from "../../components/ui";
import {
  getCurrentUser,
  getCurrentUserActivityRecords,
  getCurrentUserMemberships,
} from "../../lib/saas/queries";
import { ActivityForm } from "./activity-form";
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

  const [activities, memberships] = await Promise.all([
    getCurrentUserActivityRecords(),
    getCurrentUserMemberships(),
  ]);
  const companies = new Map(
    memberships.flatMap((membership) => membership.companies ? [[membership.company_id, membership.companies.name] as const] : []),
  );

  return (
    <MemberShell
      company={memberships[0]?.companies ?? null}
      context="Meu Va'a"
      description="Seu histórico pertence a você. Importe do relógio ou registre só o essencial."
      title="Minhas remadas"
    >
      <div className={styles.layout}>
        <section className={styles.panel}>
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
                </li>
              ))}
            </ol>
          ) : (
            <div className={styles.empty}>
              <span aria-hidden>≈</span>
              <h3>Sua primeira remada começa aqui</h3>
              <p>Importe um arquivo do relógio ou faça um registro simples.</p>
            </div>
          )}
        </section>
      </div>
    </MemberShell>
  );
}
