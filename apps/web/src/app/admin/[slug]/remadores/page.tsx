import {
  getCompanyInvitations,
  getCompanyMembers,
} from "../../../../lib/saas/queries";
import { getManageAdminContext } from "../admin-context";
import { AdminShell } from "../admin-shell";
import styles from "../admin.module.css";
import { TenantInvitations } from "../tenant-invitations";

type AdminMembersPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

function getRoleLabel(role: string) {
  if (role === "admin") {
    return "Admin";
  }

  if (role === "professional") {
    return "Treinador";
  }

  return "Remador";
}

export default async function AdminMembersPage({ params }: AdminMembersPageProps) {
  const { slug } = await params;
  const context = await getManageAdminContext(slug);
  const { company, role } = context;
  const [members, invitations] = await Promise.all([
    getCompanyMembers(company.id),
    getCompanyInvitations(company.id),
  ]);

  return (
    <AdminShell
      active="remadores"
      context={context}
      subtitle="Gerencie vínculos do clube e convites individuais de acesso."
      title="Remadores"
    >
      <section className={styles.statGrid} aria-label="Resumo dos remadores">
        <article className={styles.statCard}>
          <p>Vinculados</p>
          <strong>{members.length}</strong>
        </article>
        <article className={styles.statCard}>
          <p>Convites emitidos</p>
          <strong>{invitations.length}</strong>
        </article>
      </section>

      <section className={styles.panel}>
        <div className={styles.sectionHead}>
          <div>
            <p className={styles.eyebrow}>Membros do clube</p>
            <h2>Remadores e equipe vinculados</h2>
          </div>
        </div>
        <div className={styles.list}>
          {members.length > 0 ? (
            members.map((member) => (
              <div className={styles.listItem} key={member.id}>
                <div>
                  <strong>{member.profile?.name || "Usuário BoraSport"}</strong>
                  <p className={styles.itemDescription}>
                    {getRoleLabel(member.role)}
                  </p>
                </div>
                <span>{new Date(member.created_at).toLocaleDateString("pt-BR")}</span>
              </div>
            ))
          ) : (
            <p className={styles.empty}>Nenhum remador vinculado ainda.</p>
          )}
        </div>
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
