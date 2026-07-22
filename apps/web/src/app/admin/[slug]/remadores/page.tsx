import {
  getCompanyInvitations,
  getCompanyMembers,
} from "../../../../lib/saas/queries";
import { getManageAdminContext } from "../admin-context";
import { AdminShell } from "../admin-shell";
import styles from "../admin.module.css";
import { TenantInvitations } from "../tenant-invitations";
import { MembersDirectory } from "./members-directory";

type AdminMembersPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function AdminMembersPage({ params }: AdminMembersPageProps) {
  const { slug } = await params;
  const context = await getManageAdminContext(slug);
  const { company, role } = context;
  const [members, invitations] = await Promise.all([
    getCompanyMembers(company.id),
    getCompanyInvitations(company.id),
  ]);
  const remadores = members.filter((member) => member.role === "client").length;
  const equipe = members.length - remadores;
  const activeInvitations = invitations.filter(
    (invitation) =>
      !invitation.used_at &&
      !invitation.revoked_at &&
      new Date(invitation.expires_at).getTime() > Date.now(),
  ).length;

  return (
    <AdminShell
      active="remadores"
      context={context}
      subtitle="Gerencie vínculos do clube e convites individuais de acesso."
      title="Remadores"
    >
      <section className={styles.membersStatGrid} aria-label="Resumo das pessoas do clube">
        <article className={styles.statCard}>
          <p>Pessoas no clube</p>
          <strong>{members.length}</strong>
          <span>Todos os acessos vinculados</span>
        </article>
        <article className={styles.statCard}>
          <p>Remadores</p>
          <strong>{remadores}</strong>
          <span>Atletas com acesso ao clube</span>
        </article>
        <article className={styles.statCard}>
          <p>Equipe</p>
          <strong>{equipe}</strong>
          <span>Gestores e treinadores</span>
        </article>
        <article className={styles.statCard}>
          <p>Convites ativos</p>
          <strong>{activeInvitations}</strong>
          <span>Aguardando aceite</span>
        </article>
      </section>

      <section className={`${styles.panel} ${styles.membersPanel}`}>
        <div className={styles.sectionHeadBalanced}>
          <div>
            <p className={styles.eyebrow}>Pessoas do clube</p>
            <h2>Remadores e equipe</h2>
            <p className={styles.muted}>
              Consulte quem já possui acesso e qual é a função de cada pessoa.
            </p>
          </div>
          {role === "admin" ? (
            <a className={styles.primaryButtonLink} href="#convidar-remador">
              Convidar remador
            </a>
          ) : null}
        </div>
        <MembersDirectory members={members} />
      </section>

      {role === "admin" ? (
        <div id="convidar-remador">
          <TenantInvitations
            companyId={company.id}
            invitations={invitations}
            slug={company.slug}
          />
        </div>
      ) : (
        <section className={styles.panel}>
          <p className={styles.empty}>
            Apenas administradores podem emitir ou revogar convites.
          </p>
        </section>
      )}
    </AdminShell>
  );
}
