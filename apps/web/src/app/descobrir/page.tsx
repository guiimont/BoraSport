import Link from "next/link";
import { redirect } from "next/navigation";

import { MemberShell } from "../../components/ui";
import {
  getCurrentAthletePrivacySettings,
  getCurrentUser,
  getCurrentUserMemberships,
  getDiscoverableCompanies,
} from "../../lib/saas/queries";
import styles from "../athlete-hub.module.css";

export default async function DiscoverPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/descobrir");

  const [companies, memberships, privacy] = await Promise.all([
    getDiscoverableCompanies(),
    getCurrentUserMemberships(),
    getCurrentAthletePrivacySettings(),
  ]);

  return (
    <MemberShell
      active="moana"
      company={memberships[0]?.companies ?? null}
      context="Moana · Descobrir o Mar"
      description="Encontre grupos, clubes e novas águas sem abrir mão do controle sobre seus dados."
      title="Explore além da sua base"
    >
      <div className={styles.grid}>
        <section className={styles.panel}>
          <p className={styles.eyebrow}>Pupu pelo mapa</p>
          <h2>Grupos e clubes</h2>
          <p className={styles.muted}>Organizações disponíveis no BoraSport para consultar agenda, comunidade e oportunidades de remada.</p>
          <div className={styles.organizationList}>
            {companies.map((company) => (
              <Link className={styles.organizationCard} href={`/clube/${company.slug}`} key={company.id}>
                <span className={styles.organizationMark}>{company.name.charAt(0)}</span>
                <div><strong>{company.name}</strong><span>Pupu {company.organization_kind === "group" ? "Grupo" : "Clube"}</span></div>
                <em>Descobrir →</em>
              </Link>
            ))}
          </div>
        </section>

        <aside className={styles.stack}>
          <section className={styles.panel}>
            <p className={styles.eyebrow}>Participação voluntária</p>
            <h3>Rankings & Desafios</h3>
            <div className={styles.choice}>
              <article data-enabled={privacy?.rankings_opt_in ?? false}><strong>Rankings {privacy?.rankings_opt_in ? "ativados" : "desativados"}</strong><span>Você só aparece quando decidir participar.</span></article>
              <article data-enabled={privacy?.challenges_opt_in ?? false}><strong>Desafios {privacy?.challenges_opt_in ? "ativados" : "desativados"}</strong><span>Nenhuma inscrição automática.</span></article>
            </div>
            <p className={styles.muted}>Controle essas escolhas em ‘Aito · Atleta & Ajustes.</p>
          </section>
          <section className={styles.panel}>
            <p className={styles.eyebrow}>Eventos & Conexões</p>
            <h3>Um mar maior está se formando</h3>
            <p className={styles.muted}>Eventos e remadores públicos aparecerão aqui somente quando houver publicação e consentimento reais.</p>
          </section>
        </aside>
      </div>
    </MemberShell>
  );
}
