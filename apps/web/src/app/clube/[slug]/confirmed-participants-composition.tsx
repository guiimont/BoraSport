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

function getInitial(name: string) {
  return (name.trim().slice(0, 1) || "R").toUpperCase();
}

function ParticipantPhoto({ participant }: { participant: SlotParticipant }) {
  const [failed, setFailed] = useState(false);
  const initial = getInitial(participant.name);

  if (!participant.avatar_url || failed) {
    return <span className={styles.canoeAvatar}>{initial}</span>;
  }

  return (
    <span className={styles.canoeAvatar}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img alt="" onError={() => setFailed(true)} src={participant.avatar_url} />
    </span>
  );
}

export function ConfirmedParticipantsComposition({
  capacity,
  participantLabel,
  participants,
}: ConfirmedParticipantsCompositionProps) {
  const safeCapacity = Math.max(1, Math.floor(Number(capacity) || 0));
  const occupied = Math.min(participants.length, safeCapacity);
  const seats = Array.from({ length: safeCapacity }, (_, index) => ({
    participant: participants[index] ?? null,
    seatKey: participants[index]?.public_profile_id ?? `empty-${index}`,
  }));

  return (
    <section
      aria-label={`${occupied} de ${safeCapacity} participantes confirmados`}
      className={styles.participantsComposition}
    >
      <div className={styles.participantsCompositionHeader}>
        <div>
          <p className={styles.participantsLabel}>Participantes confirmados</p>
          <p className={styles.participantsText}>
            {participants.length > 0
              ? `${occupied} de ${safeCapacity} confirmados`
              : `Seja o primeiro entre os ${participantLabel}.`}
          </p>
        </div>

        <span className={styles.compositionCount}>
          {occupied}/{safeCapacity}
        </span>
      </div>

      <div className={styles.canoeVisual}>
        <div className={styles.canoeSeats}>
          {seats.map(({ participant, seatKey }, index) =>
            participant ? (
              <Link
                aria-label={`Abrir perfil esportivo público de ${participant.name}`}
                className={styles.canoeParticipant}
                href={`/remadores/${participant.public_profile_id}`}
                key={`${participant.slot_id}-${seatKey}`}
                title={participant.name}
              >
                <ParticipantPhoto participant={participant} />
                <span className={styles.canoeName}>{participant.name}</span>
              </Link>
            ) : (
              <span
                aria-label={`Vaga disponível ${index + 1}`}
                className={styles.canoeEmptySeat}
                key={seatKey}
              >
                <span aria-hidden="true" className={styles.canoeEmptyDot} />
                <span className={styles.canoeName}>Vaga</span>
              </span>
            ),
          )}
        </div>
      </div>

      <p className={styles.canoeNote}>
        Visual informativo; a escalação oficial da canoa ainda não foi publicada.
      </p>
    </section>
  );
}
