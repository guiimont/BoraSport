"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
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

function ParticipantSeat({ participant }: { participant: SlotParticipant }) {
  return (
    <Link
      aria-label={`Abrir perfil esportivo público de ${participant.name}`}
      className={styles.canoeParticipant}
      href={`/remadores/${participant.public_profile_id}`}
      title={participant.name}
    >
      <ParticipantAvatar participant={participant} />
      <span className={styles.canoeName}>{participant.name}</span>
    </Link>
  );
}

function V6Composition({ seats }: { seats: Seat[] }) {
  return (
    <div className={styles.v6Composition}>
      <svg
        aria-hidden="true"
        className={styles.v6Diagram}
        focusable="false"
        viewBox="0 0 320 520"
      >
        <path
          className={styles.v6Hull}
          d="M204 24 C224 58 230 126 228 248 C230 372 224 462 204 504 C184 462 178 372 180 248 C178 126 184 58 204 24 Z"
        />
        <line className={styles.v6Iako} x1="78" x2="182" y1="166" y2="166" />
        <line className={styles.v6Iako} x1="78" x2="182" y1="342" y2="342" />
        <path
          className={styles.v6Ama}
          d="M66 76 C82 120 86 186 86 260 C86 334 82 400 66 444 C50 400 46 334 46 260 C46 186 50 120 66 76 Z"
        />
      </svg>

      <div
        className={styles.v6Seats}
        style={
          {
            "--seat-count": seats.length,
          } as CSSProperties
        }
      >
        {seats.map(({ participant, seatKey }, index) => (
          <div className={styles.v6Seat} key={seatKey}>
            {participant ? (
              <ParticipantSeat participant={participant} />
            ) : (
              <EmptySeat index={index} />
            )}
          </div>
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
  const hiddenPreviewCount = Math.max(0, participants.length - previewParticipants.length);

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
