import { getCompanyActivityRecords } from "../../../../lib/saas/queries";
import { getManageAdminContext } from "../admin-context";
import { AdminShell } from "../admin-shell";
import styles from "../admin.module.css";

type Props = { params: Promise<{ slug: string }> };
const date = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });
const number = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
const feelingLabels = { great: "Muito bem", good: "Bem", neutral: "Normal", tired: "Cansado", exhausted: "Esgotado" } as const;

export default async function OrganizationActivitiesPage({ params }: Props) {
  const { slug } = await params;
  const context = await getManageAdminContext(slug);
  const activities = await getCompanyActivityRecords(context.company.id);
  const validated = activities.filter((activity) => activity.attendance_validation_status === "validated");

  return (
    <AdminShell
      active="atividades"
      context={context}
      eyebrow="Presença auditável"
      subtitle="Reserva é intenção. A presença nasce do match com uma atividade real ou da validação manual da equipe."
      title={context.company.organization_kind === "group" ? "Atividades do grupo" : "Presenças & atividades"}
    >
      <section className={styles.panel}>
        <div className={styles.sectionHead}>
          <div><p className={styles.eyebrow}>Histórico verificável</p><h2>{validated.length} presenças validadas</h2></div>
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr><th>Remador</th><th>Atividade</th><th>Quando</th><th>Distância</th><th>Retorno</th><th>Auditoria</th></tr></thead>
            <tbody>
              {activities.map((activity) => (
                <tr key={activity.id}>
                  <td>{activity.athlete?.name || "Remador BoraSport"}</td>
                  <td>{activity.title || "Remada"}</td>
                  <td>{date.format(new Date(activity.started_at))}</td>
                  <td>{activity.distance_meters !== null ? `${number.format(activity.distance_meters / 1000)} km` : "—"}</td>
                  <td>{activity.athlete_feedback_at ? <span>{activity.athlete_rpe}/10 · {activity.athlete_feeling ? feelingLabels[activity.athlete_feeling] : "—"}{activity.athlete_pain ? " · Dor sinalizada" : ""}{activity.athlete_notes ? ` · ${activity.athlete_notes}` : ""}</span> : "Pendente"}</td>
                  <td>{activity.attendance_validation_status === "validated" ? (activity.attendance_validation_source === "coach_manual" ? "Treinador" : "Match de atividade") : "Não vinculada"}</td>
                </tr>
              ))}
              {!activities.length ? <tr><td className={styles.emptyCell} colSpan={6}>Nenhuma atividade compartilhada ou presença validada nesta organização.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </AdminShell>
  );
}
