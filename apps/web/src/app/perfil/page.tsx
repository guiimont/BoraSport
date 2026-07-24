import { redirect } from "next/navigation";

import {
  getCurrentProfile,
  getCurrentUser,
  getCurrentUserMemberships,
} from "../../lib/saas/queries";
import { ActionLink, Alert, MemberShell } from "../../components/ui";
import { ProfileForm } from "./profile-form";
import styles from "./profile.module.css";

export default async function ProfilePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/perfil");
  }

  const profile = await getCurrentProfile();
  const memberships = await getCurrentUserMemberships();
  const primaryCompany = memberships[0]?.companies ?? null;
  const isProfileIncomplete =
    !profile?.name || !profile?.phone || !profile?.avatar_url;

  return (
    <MemberShell
      company={primaryCompany}
      context="Perfil do remador"
      title="Meu perfil"
    >
      <div className={styles.layout}>
        <section className={styles.profilePanel} aria-labelledby="profile-heading">
          {isProfileIncomplete ? (
            <Alert tone="warning">
              Complete nome, telefone e foto para deixar seu perfil pronto para
              a rotina do clube.
            </Alert>
          ) : (
            <Alert tone="success">
              Seu perfil básico está pronto para aparecer nas reservas.
            </Alert>
          )}

          <ProfileForm
            companyName={primaryCompany?.name}
            email={user.email || ""}
            profile={profile}
          />
        </section>

        <aside className={styles.sidePanel} aria-label="Resumo do perfil">
          <section className={styles.card}>
            <p className={styles.eyebrow}>Meu clube</p>
            {primaryCompany ? (
              <>
                <h3>{primaryCompany.name}</h3>
                <p className={styles.cardText}>
                  Veja os próximos horários e faça suas reservas.
                </p>
                <ActionLink href={`/clube/${primaryCompany.slug}`} variant="primary">
                  Acessar clube
                </ActionLink>
              </>
            ) : (
              <p className={styles.cardText}>
                Nenhum clube foi identificado para esta conta neste momento.
                Quando houver vínculo, o acesso ao clube aparecerá aqui.
              </p>
            )}
          </section>

          <section className={styles.card}>
            <p className={styles.eyebrow}>Conta e segurança</p>
            <h3>E-mail de acesso</h3>
            <p className={styles.accountEmail}>{user.email || "Não informado"}</p>
            <p className={styles.cardText}>
              Este é o e-mail usado para entrar no BoraSport.
            </p>
          </section>
        </aside>
      </div>
    </MemberShell>
  );
}
