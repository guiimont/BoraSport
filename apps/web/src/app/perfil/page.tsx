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
  const displayName = profile?.name || user.email || "Remador BoraSport";
  const isProfileIncomplete =
    !profile?.name || !profile?.phone || !profile?.avatar_url;

  return (
    <MemberShell
      company={primaryCompany}
      context="Perfil do remador"
      title="Meu perfil"
      userEmail={user.email}
      userName={displayName}
    >
      <div className={styles.layout}>
        <section className={styles.profilePanel} aria-labelledby="profile-heading">
          <div className={styles.profileHeader}>
            <span className={styles.avatar}>
              {profile?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img alt={displayName} src={profile.avatar_url} />
              ) : (
                displayName.slice(0, 1).toUpperCase()
              )}
            </span>
            <div className={styles.profileIntro}>
              <p className={styles.eyebrow}>Identidade no BoraSport</p>
              <h2 id="profile-heading">{displayName}</h2>
              <p>
                Sua foto e seus dados aparecem nos fluxos do clube onde a
                plataforma já usa participantes confirmados.
              </p>
            </div>
          </div>

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

          <ProfileForm email={user.email || ""} profile={profile} />
        </section>

        <aside className={styles.sidePanel} aria-label="Resumo do perfil">
          <section className={styles.card}>
            <p className={styles.eyebrow}>Dados atuais</p>
            <dl className={styles.dataList}>
              <div>
                <dt>Nome</dt>
                <dd>{profile?.name || "Ainda não informado"}</dd>
              </div>
              <div>
                <dt>E-mail</dt>
                <dd>{user.email || "Não informado"}</dd>
              </div>
              <div>
                <dt>Telefone</dt>
                <dd>{profile?.phone || "Ainda não informado"}</dd>
              </div>
              <div>
                <dt>Foto</dt>
                <dd>{profile?.avatar_url ? "Configurada" : "Ainda não enviada"}</dd>
              </div>
            </dl>
          </section>

          <section className={styles.card}>
            <p className={styles.eyebrow}>Clube</p>
            {primaryCompany ? (
              <>
                <h3>{primaryCompany.name}</h3>
                <p className={styles.cardText}>
                  Acesse a página pública do clube para ver agenda, treinos e
                  reservas disponíveis.
                </p>
                <ActionLink href={`/clube/${primaryCompany.slug}`} variant="primary">
                  Abrir clube
                </ActionLink>
              </>
            ) : (
              <p className={styles.cardText}>
                Nenhum clube foi identificado para esta conta neste momento.
                Quando houver vínculo, o acesso ao clube aparecerá aqui.
              </p>
            )}
          </section>
        </aside>
      </div>
    </MemberShell>
  );
}
