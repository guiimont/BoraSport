import { notFound } from "next/navigation";
import type { CSSProperties } from "react";

import {
  getActiveSlotsByClubSlug,
  getClubBySlug,
} from "../../../lib/saas/queries";

import styles from "./page.module.css";

type ClubPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

export const dynamic = "force-dynamic";

function formatDateTime(value: string) {
  return dateFormatter.format(new Date(value));
}

export default async function ClubPage({ params }: ClubPageProps) {
  const { slug } = await params;
  const club = await getClubBySlug(slug);

  if (!club) {
    notFound();
  }

  const slots = await getActiveSlotsByClubSlug(slug);
  const themeStyle = {
    "--club-color": club.primary_color ?? "#0f766e",
  } as CSSProperties & Record<"--club-color", string>;

  return (
    <main className={styles.page} style={themeStyle}>
      <section className={styles.header}>
        <div className={styles.identity}>
          {club.logo_url ? (
            <img className={styles.logo} src={club.logo_url} alt="" />
          ) : (
            <div className={styles.logoFallback} aria-hidden="true">
              {club.name.slice(0, 1)}
            </div>
          )}

          <div>
            <p className={styles.appName}>BoraSport</p>
            <h1 className={styles.title}>{club.name}</h1>
          </div>
        </div>
      </section>

      <section className={styles.content} aria-labelledby="slots-title">
        <div className={styles.sectionHeader}>
          <h2 id="slots-title">Horários disponíveis</h2>
          <p>{slots.length} horário{slots.length === 1 ? "" : "s"}</p>
        </div>

        {slots.length > 0 ? (
          <div className={styles.slotList}>
            {slots.map((slot) => (
              <article className={styles.slot} key={slot.id}>
                <div className={styles.slotInfo}>
                  <h3>{slot.title}</h3>
                  <dl className={styles.details}>
                    <div>
                      <dt>Início</dt>
                      <dd>{formatDateTime(slot.starts_at)}</dd>
                    </div>
                    <div>
                      <dt>Fim</dt>
                      <dd>{formatDateTime(slot.ends_at)}</dd>
                    </div>
                    <div>
                      <dt>Capacidade</dt>
                      <dd>{slot.capacity} aluno{slot.capacity === 1 ? "" : "s"}</dd>
                    </div>
                  </dl>
                </div>

                <button className={styles.reserveButton} type="button" disabled>
                  Reservar
                </button>
              </article>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <h3>Nenhum horário disponível</h3>
            <p>Novos horários serão exibidos aqui quando o clube publicar a agenda.</p>
          </div>
        )}
      </section>
    </main>
  );
}
