import Link from "next/link";
import { redirect } from "next/navigation";

import {
  getCurrentProfile,
  getCurrentUser,
} from "../../lib/saas/queries";
import { ProfileForm } from "./profile-form";
import styles from "./profile.module.css";

export default async function ProfilePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/perfil");
  }

  const profile = await getCurrentProfile();

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.topbar}>
          <span className={styles.brand}>BoraSport</span>
          <Link className={styles.backLink} href="/">
            Inicio
          </Link>
        </header>

        <div className={styles.layout}>
          <aside className={styles.summary}>
            <h1 className={styles.summaryTitle}>Perfil do participante</h1>
            <p className={styles.summaryText}>
              Sua foto aparece pequena na lista de confirmados dos horarios,
              junto com os outros participantes da atividade.
            </p>

            <div className={styles.profileCard}>
              <span className={styles.avatar}>
                {profile?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt={profile.name}
                    src={profile.avatar_url}
                  />
                ) : (
                  (profile?.name || user.email || "U").slice(0, 1).toUpperCase()
                )}
              </span>
              <div className={styles.identity}>
                <p className={styles.name}>{profile?.name || "Sem nome"}</p>
                <p className={styles.email}>{user.email}</p>
              </div>
            </div>
          </aside>

          <section className={styles.formCard}>
            <ProfileForm email={user.email || ""} profile={profile} />
          </section>
        </div>
      </div>
    </main>
  );
}
