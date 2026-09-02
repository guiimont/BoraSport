import Link from "next/link";
import { redirect } from "next/navigation";

import { MemberShell } from "../../components/ui";
import {
  getCurrentProfile,
  getCurrentUser,
  getCurrentUserActivityRecords,
  getCurrentUserMemberships,
} from "../../lib/saas/queries";
import styles from "../athlete-hub.module.css";

const number = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
const date = new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeZone: "America/Sao_Paulo" });

export default async function CommunityPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/comunidade");

  const [profile, activities, memberships] = await Promise.all([
    getCurrentProfile(),
    getCurrentUserActivityRecords(),
    getCurrentUserMemberships(),
  ]);
  const distance = activities.reduce((total, activity) => total + (activity.distance_meters ?? 0), 0);
  const validated = activities.filter((activity) => activity.attendance_validation_status === "validated").length;

  return (
    <MemberShell
      active="amuiraa"
      company={memberships[0]?.companies ?? null}
      context="‘Āmuira‘a · Feed & Comunidade"
      description="Sua vida no va'a, suas conexões e os sinais da comunidade em um só lugar."
      greetingName={profile?.name?.split(" ")[0] ?? null}
      title="O mar conecta"
    >
      <div className={styles.grid}>
        <section className={styles.panel}>
          <p className={styles.eyebrow}>Seu resumo</p>
          <h2>Uma conta. Toda a sua jornada.</h2>
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
          {!activities.length ? <div className={styles.empty}>O mar chama. Registre sua primeira atividade em Hoe.</div> : null}
        </section>

        <aside className={styles.stack}>
          <section className={styles.panel}>
            <div className={styles.privacySeal}><strong>Modo Rāhui Ativo 🛡️</strong><span>Seus dados de saúde estão privados e o ponto de saída do trajeto está oculto.</span></div>
          </section>
          <section className={styles.panel}>
            <p className={styles.eyebrow}>Pupu · Organizações</p>
            <h3>Seus vínculos</h3>
            <div className={styles.organizationList}>
              {memberships.map((membership) => membership.companies ? (
                <Link className={styles.organizationCard} href={`/clube/${membership.companies.slug}`} key={membership.id}>
                  <span className={styles.organizationMark}>{membership.companies.name.charAt(0)}</span>
                  <div><strong>{membership.companies.name}</strong><span>Pupu {membership.companies.organization_kind === "group" ? "Grupo" : "Clube"}</span></div>
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
