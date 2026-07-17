import Link from "next/link";
import { notFound } from "next/navigation";

import { BrandMark } from "../../../components/ui";
import { getPublicSportProfile } from "../../../lib/saas/queries";

import styles from "./public-profile.module.css";

type PublicRowerProfilePageProps = {
  params: Promise<{
    publicId: string;
  }>;
};

export default async function PublicRowerProfilePage({
  params,
}: PublicRowerProfilePageProps) {
  const { publicId } = await params;
  const profile = await getPublicSportProfile(publicId);

  if (!profile) {
    notFound();
  }

  return (
    <main className={styles.page}>
      <section className={styles.card} aria-labelledby="public-profile-title">
        <BrandMark variant="light" />

        <div className={styles.avatarFrame}>
          {profile.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt="" src={profile.avatar_url} />
          ) : (
            <span>{profile.name.slice(0, 1).toUpperCase()}</span>
          )}
        </div>

        <div className={styles.content}>
          <p className={styles.eyebrow}>Perfil esportivo público</p>
          <h1 id="public-profile-title">{profile.name}</h1>
          <p>
            Este perfil exibe apenas informações públicas aprovadas para a
            comunidade BoraSport. Dados privados como e-mail, telefone e
            identificadores internos não são publicados.
          </p>
        </div>

        <Link className={styles.backLink} href="/">
          Voltar ao BoraSport
        </Link>
      </section>
    </main>
  );
}
