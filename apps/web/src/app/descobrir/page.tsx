import Link from "next/link";
import { redirect } from "next/navigation";

import { MemberShell } from "../../components/ui";
import {
  getCurrentUser,
  getCurrentUserMemberships,
  getDiscoverableCompanies,
} from "../../lib/saas/queries";
import styles from "../athlete-hub.module.css";

export default async function DiscoverPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/descobrir");

  const [companies, memberships] = await Promise.all([
    getDiscoverableCompanies(),
    getCurrentUserMemberships(),
  ]);

  return (
    <MemberShell
      active="moana"
      company={memberships[0]?.companies ?? null}
      context="Clubes"
      description="Consulte agendas, encontre novas bases e acesse seus clubes."
      title="Encontre onde remar"
    >
      <div className={styles.grid}>
        <section className={styles.panel}>
          <p className={styles.eyebrow}>Clubes disponíveis</p>
          <h2>Grupos e clubes</h2>
          <p className={styles.muted}>Organizações disponíveis no BoraSport para consultar agenda, comunidade e oportunidades de remada.</p>
          <div className={styles.organizationList}>
            {companies.map((company) => (
              <Link className={styles.organizationCard} href={`/clube/${company.slug}`} key={company.id}>
                <span className={styles.organizationMark}>{company.name.charAt(0)}</span>
                <div><strong>{company.name}</strong><span>{company.organization_kind === "group" ? "Grupo" : "Clube"}</span></div>
                <em>Ver agenda →</em>
              </Link>
            ))}
          </div>
        </section>

        <aside className={styles.stack}>
          <section className={styles.panel}>
            <p className={styles.eyebrow}>Como funciona</p>
            <h3>Escolha um clube</h3>
            <p className={styles.muted}>Abra a página do clube para consultar horários, informações da base e opções de reserva.</p>
          </section>
        </aside>
      </div>
    </MemberShell>
  );
}
