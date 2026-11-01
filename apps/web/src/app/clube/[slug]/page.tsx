import Link from "next/link";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";

import {
  getActivityExperience,
  normalizeVocabulary,
} from "../../../lib/saas/activity-presets";
import {
  getCompanyBySlug,
  getCompanySlotParticipants,
  getCompanySlots,
  getCompanyWeeklyWorkouts,
  getCurrentUserActiveBookings,
  getCurrentUserMemberships,
  getCurrentUserNotifications,
} from "../../../lib/saas/queries";

import { ClubTabs } from "./club-tabs";
import styles from "./club-page.module.css";

type ClubPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

type ClubPageStyle = CSSProperties & Record<`--${string}`, string>;

export default async function ClubPage({ params }: ClubPageProps) {
  const { slug } = await params;
  const company = await getCompanyBySlug(slug);

  if (!company) {
    notFound();
  }

  const [
    slots,
    participantsBySlot,
    weeklyWorkouts,
    currentUserBookings,
    memberships,
    notifications,
  ] =
    await Promise.all([
    getCompanySlots(company.id),
    getCompanySlotParticipants(company.id),
    getCompanyWeeklyWorkouts(company.id),
    getCurrentUserActiveBookings(company.id),
    getCurrentUserMemberships(),
    getCurrentUserNotifications(),
  ]);
  const companyMembership = memberships.find(
    (membership) => membership.company_id === company.id,
  );
  const canManage =
    companyMembership?.role === "admin" ||
    companyMembership?.role === "professional";
  const vocabulary = normalizeVocabulary(company.vocabulary_config);
  const experience = getActivityExperience(company.type_de_negocio, vocabulary);
  const theme = company.theme_colors || {};
  const unreadNotifications = notifications.filter((item) => !item.read_at).length;

  const pageStyle: ClubPageStyle = {
    "--club-primary": theme.primary || "#063b5b",
    "--club-secondary": theme.secondary || "#0f766e",
    "--club-accent": theme.accent || "#f59e0b",
    "--club-background": theme.background || "#f8fafc",
  };

  return (
    <main className={styles.page} style={pageStyle}>
      <header className={styles.hero}>
        <div className={styles.heroInner}>
          <div>
            <p className={styles.eyebrow}>{vocabulary.booking_label} online</p>
            <h1 className={styles.title}>{company.name}</h1>
            <p className={styles.lead}>{experience.agendaHint}</p>
            <nav className={styles.contextNav} aria-label="Áreas do Bora">
              <Link className={styles.contextLinkPrimary} href="/perfil">
                Área do aluno
              </Link>
              <Link className={styles.contextLink} href="/notificacoes">
                Avisos{unreadNotifications ? ` (${unreadNotifications})` : ""}
              </Link>
              {canManage ? (
                <Link
                  className={styles.contextLink}
                  href={`/admin/${company.slug}`}
                >
                  Painel do gestor
                </Link>
              ) : null}
            </nav>
          </div>

        </div>
      </header>

      <ClubTabs
        companyId={company.id}
        currentUserBookings={currentUserBookings}
        experience={experience}
        participantsBySlot={participantsBySlot}
        slug={company.slug}
        slots={slots}
        weeklyWorkouts={weeklyWorkouts}
        vocabulary={vocabulary}
      />
    </main>
  );
}
