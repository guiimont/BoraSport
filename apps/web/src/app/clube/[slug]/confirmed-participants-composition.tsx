"use client";

import Link from "next/link";
import { useState } from "react";

import type { SlotParticipant } from "../../../types/saas";
import styles from "./club-page.module.css";

type ConfirmedParticipantsCompositionProps = {
  capacity: number;
  participantLabel: string;
  participants: SlotParticipant[];
};

type Seat = {
  participant: SlotParticipant | null;
  seatKey: string;
};

function getInitial(name: string) {
  return (name.trim().slice(0, 1) || "R").toUpperCase();
}

function getFirstName(name: string) {
  return name.trim().split(/\s+/)[0] || "Remador";
}

function buildSeats(capacity: number, participants: SlotParticipant[]) {
  return Array.from({ length: capacity }, (_, index) => ({
    participant: participants[index] ?? null,
    seatKey: participants[index]?.public_profile_id ?? `empty-${index}`,
  }));
}

function ParticipantAvatar({
  participant,
  variant = "default",
}: {
  participant: SlotParticipant;
  variant?: "default" | "small";
}) {
  const [failed, setFailed] = useState(false);
  const initial = getInitial(participant.name);
  const className =
    variant === "small" ? styles.participantPreviewAvatar : styles.canoeAvatar;

  if (!participant.avatar_url || failed) {
    return <span className={className}>{initial}</span>;
  }

  return (
    <span className={className}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img alt="" onError={() => setFailed(true)} src={participant.avatar_url} />
    </span>
  );
}

function EmptySeat({ index }: { index: number }) {
  return (
    <span aria-label={`Vaga disponível ${index + 1}`} className={styles.emptySeat}>
      <span aria-hidden="true" className={styles.emptySeatMarker} />
      <span className={styles.canoeName}>Vaga</span>
    </span>
  );
}

function ParticipantSeat({
  participant,
  showName = true,
}: {
  participant: SlotParticipant;
  showName?: boolean;
}) {
  return (
    <Link
      aria-label={`Abrir perfil esportivo público de ${participant.name}`}
      className={styles.canoeParticipant}
      href={`/remadores/${participant.public_profile_id}`}
      title={participant.name}
    >
      <ParticipantAvatar participant={participant} />
      {showName ? (
        <span className={styles.canoeName}>{getFirstName(participant.name)}</span>
      ) : null}
    </Link>
  );
}

function getSeatPosition(index: number, capacity: number) {
  if (capacity === 1) {
    return { x: 170, y: 260 };
  }

  const firstY = 130;
  const lastY = 390;
  const step = (lastY - firstY) / Math.max(1, capacity - 1);

  return {
    x: 170,
    y: firstY + step * index,
  };
}

function HtmlSeat({
  index,
  participant,
  total,
}: {
  index: number;
  participant: SlotParticipant | null;
  total: number;
}) {
  const { x, y } = getSeatPosition(index, total);
  const position = {
    left: `${(x / 320) * 100}%`,
    top: `${(y / 520) * 100}%`,
  };

  if (!participant) {
    return (
      <span
        aria-label={`Vaga disponível ${index + 1}`}
        className={`${styles.v6HtmlSeat} ${styles.v6HtmlVacancy}`}
        style={position}
      />
    );
  }

  return (
    <Link
      aria-label={`Abrir perfil esportivo público de ${participant.name}`}
      className={styles.v6HtmlSeat}
      href={`/remadores/${participant.public_profile_id}`}
      style={position}
      title={participant.name}
    >
      <ParticipantAvatar participant={participant} />
    </Link>
  );
}

function V6Composition({ seats }: { seats: Seat[] }) {
  const participants = seats
    .map((seat) => seat.participant)
    .filter((participant): participant is SlotParticipant => Boolean(participant));

  return (
    <div className={styles.v6Composition}>
      <div
        aria-label={`Va'a com ${participants.length} participantes confirmados em ${seats.length} vagas`}
        className={styles.v6Stage}
        role="img"
      >
        <svg
          aria-hidden="true"
          className={styles.v6Diagram}
          viewBox="0 0 320 520"
        >
          <path
            className={styles.v6Hull}
            d="M170 24 C207 80 225 154 225 260 C225 366 207 454 170 496 C133 454 115 366 115 260 C115 154 133 80 170 24 Z"
          />
          <line className={styles.v6Iako} x1="86" x2="118" y1="170" y2="170" />
          <line className={styles.v6Iako} x1="86" x2="118" y1="350" y2="350" />
          <path
            className={styles.v6Ama}
            d="M74 70 C86 120 88 190 88 260 C88 330 86 400 74 450 C62 400 60 330 60 260 C60 190 62 120 74 70 Z"
          />
        </svg>
        {seats.map(({ participant, seatKey }, index) => (
          <HtmlSeat
            index={index}
            key={seatKey}
            participant={participant}
            total={seats.length}
          />
        ))}
      </div>
    </div>
  );
}

function CompactParticipantsGrid({ seats }: { seats: Seat[] }) {
  return (
    <div className={styles.compactParticipantsGrid}>
      {seats.map(({ participant, seatKey }, index) =>
        participant ? (
          <ParticipantSeat key={seatKey} participant={participant} />
        ) : (
          <EmptySeat index={index} key={seatKey} />
        ),
      )}
    </div>
  );
}

export function ConfirmedParticipantsComposition({
  capacity,
  participantLabel,
  participants,
}: ConfirmedParticipantsCompositionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const safeCapacity = Math.max(1, Math.floor(Number(capacity) || 0));
  const occupied = Math.min(participants.length, safeCapacity);
  const available = Math.max(0, safeCapacity - occupied);
  const seats = buildSeats(safeCapacity, participants);
  const usesV6Visual = safeCapacity <= 6;
  const previewParticipants = participants.slice(0, 5);
  const hiddenPreviewCount = Math.max(
    0,
    participants.length - previewParticipants.length,
  );

  return (
    <section
      aria-label={`${occupied} de ${safeCapacity} participantes confirmados`}
      className={styles.participantsComposition}
    >
      <div className={styles.participantsSummary}>
        <div className={styles.participantsSummaryCopy}>
          <p className={styles.participantsLabel}>Participantes confirmados</p>
          <p className={styles.participantsText}>
            {participants.length > 0
              ? `${occupied} de ${safeCapacity} confirmados · ${available} ${
                  available === 1 ? "vaga" : "vagas"
                }`
              : `Seja o primeiro entre os ${participantLabel}.`}
          </p>
        </div>

        <div className={styles.participantsSummaryActions}>
          {!isExpanded ? (
            <div
              aria-label={`${previewParticipants.length} participantes no resumo`}
              className={styles.participantPreviewStack}
            >
              {previewParticipants.map((participant) => (
                <Link
                  aria-label={`Abrir perfil esportivo público de ${participant.name}`}
                  className={styles.participantPreviewLink}
                  href={`/remadores/${participant.public_profile_id}`}
                  key={`${participant.slot_id}-${participant.public_profile_id}`}
                  title={participant.name}
                >
                  <ParticipantAvatar participant={participant} variant="small" />
                </Link>
              ))}
              {hiddenPreviewCount > 0 ? (
                <span className={styles.participantPreviewMore}>
                  +{hiddenPreviewCount}
                </span>
              ) : null}
            </div>
          ) : null}

          <button
            aria-expanded={isExpanded}
            className={styles.participantsToggle}
            onClick={() => setIsExpanded((current) => !current)}
            type="button"
          >
            {isExpanded ? "Ocultar" : "Ver participantes"}
          </button>
        </div>
      </div>

      {isExpanded ? (
        <div className={styles.participantsExpanded}>
          {usesV6Visual ? (
            <V6Composition seats={seats} />
          ) : (
            <CompactParticipantsGrid seats={seats} />
          )}

          <p className={styles.canoeNote}>
            {usesV6Visual
              ? "Visual informativo em linguagem de V6; a escalação oficial da canoa ainda não foi publicada."
              : "Capacidade acima de seis vagas sem montagem publicada; participantes aparecem em grade compacta, sem distribuição por canoa."}
          </p>
        </div>
      ) : null}
    </section>
  );
}
