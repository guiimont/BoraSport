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
} from "../../../lib/saas/queries";

import { ClubTabs } from "./club-tabs";
import styles from "./club-page.module.css";

type ClubPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

type ClubPageStyle = CSSProperties & Record<`--${string}`, string>;

function formatDateTime(value?: string | null) {
  if (!value) {
    return "Agenda em montagem";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function remainingSpots(spotsTotal?: number, spotsOccupied?: number) {
  return Math.max(0, Number(spotsTotal || 0) - Number(spotsOccupied || 0));
}

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
  ] =
    await Promise.all([
    getCompanySlots(company.id),
    getCompanySlotParticipants(company.id),
    getCompanyWeeklyWorkouts(company.id),
    getCurrentUserActiveBookings(company.id),
    getCurrentUserMemberships(),
  ]);
  const companyMembership = memberships.find(
    (membership) => membership.company_id === company.id,
  );
  const canManage =
    companyMembership?.role === "admin" ||
    companyMembership?.role === "professional";
  const nextSlot = slots[0];
  const nextParticipants = nextSlot ? participantsBySlot[nextSlot.id] || [] : [];
  const vocabulary = normalizeVocabulary(company.vocabulary_config);
  const experience = getActivityExperience(company.type_de_negocio, vocabulary);
  const theme = company.theme_colors || {};

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

          <aside className={styles.nextCard}>
            <p className={styles.nextLabel}>
              Próximo {vocabulary.service_label.toLowerCase()}
            </p>
            <h2 className={styles.nextTitle}>
              {nextSlot?.services?.name || "Sem vagas abertas"}
            </h2>
            <p className={styles.nextTime}>
              {formatDateTime(nextSlot?.start_time)}
            </p>

            {nextSlot ? (
              <>
                <div className={styles.statGrid}>
                  <div className={styles.stat}>
                    <span>Disponíveis</span>
                    <strong>
                      {remainingSpots(
                        nextSlot.spots_total,
                        nextSlot.spots_occupied,
                      )}
                      /{nextSlot.spots_total}
                    </strong>
                  </div>
                  <div className={styles.stat}>
                    <span>{vocabulary.resource_label}</span>
                    <strong>{nextSlot.resources?.name || "A definir"}</strong>
                  </div>
                </div>

                <div className={styles.crewLine}>
                  <p className={styles.participantsLabel}>
                    {nextParticipants.length} {experience.participantLabel}
                  </p>
                  <div className={styles.avatarStack}>
                    {nextParticipants.slice(0, 5).map((participant) => (
                      <Link
                        className={styles.avatar}
                        href={`/remadores/${participant.public_profile_id}`}
                        key={`${participant.slot_id}-${participant.public_profile_id}`}
                        title={participant.name}
                      >
                        {participant.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img alt="" src={participant.avatar_url} />
                        ) : (
                          participant.name.slice(0, 1).toUpperCase()
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
              </>
            ) : null}
          </aside>
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
