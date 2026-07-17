"use client";

import type { ActivityExperience } from "../../../lib/saas/activity-presets";
import type {
  CompanySlot,
  SlotParticipant,
  VocabularyConfig,
} from "../../../types/saas";
import { reserveSlot } from "./actions";
import styles from "./club-page.module.css";

type ReservationSlotsProps = {
  companyId: string;
  experience: ActivityExperience;
  participantsBySlot: Record<string, SlotParticipant[]>;
  slots: CompanySlot[];
  vocabulary: Required<VocabularyConfig>;
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatCurrency(value?: number | string | null) {
  if (value === null || value === undefined) {
    return null;
  }

  const amount = Number(value);

  if (amount === 0) {
    return "Incluso";
  }

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(amount);
}

function AvatarStack({ participants }: { participants: SlotParticipant[] }) {
  return (
    <div className={styles.avatarStack}>
      {participants.slice(0, 5).map((participant) => (
        <span
          className={styles.avatar}
          key={`${participant.slot_id}-${participant.user_id}`}
          title={participant.name}
        >
          {participant.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt={participant.name} src={participant.avatar_url} />
          ) : (
            participant.name.slice(0, 1).toUpperCase()
          )}
        </span>
      ))}
    </div>
  );
}

export function ReservationSlots({
  companyId,
  experience,
  participantsBySlot,
  slots,
  vocabulary,
}: ReservationSlotsProps) {
  if (slots.length === 0) {
    return (
      <div className={styles.emptyState}>
        Nenhum {vocabulary.service_label.toLowerCase()} disponivel para os
        proximos dias.
      </div>
    );
  }

  return (
    <div className={styles.slotList}>
      {slots.map((slot) => {
        const remaining = Math.max(
          0,
          Number(slot.spots_total || 0) - Number(slot.spots_occupied || 0),
        );
        const price = formatCurrency(slot.services?.price);
        const isFull = remaining === 0;
        const participants = participantsBySlot[slot.id] || [];

        return (
          <article className={styles.slotCard} key={slot.id}>
            <div className={styles.slotMain}>
              <div>
                <p className={styles.slotTime}>
                  {formatDateTime(slot.start_time)}
                </p>
                <h3 className={styles.slotTitle}>
                  {slot.services?.name || vocabulary.service_label}
                </h3>
                <p className={styles.slotMeta}>
                  {vocabulary.resource_label}:{" "}
                  {slot.resources?.name || "A definir"}
                </p>
              </div>

              <div className={styles.statGridThree}>
                <div className={`${styles.stat} ${styles.statCenter}`}>
                  <span>Vagas</span>
                  <strong>
                    {remaining}/{slot.spots_total}
                  </strong>
                </div>
                <div className={`${styles.stat} ${styles.statCenter}`}>
                  <span>Duração</span>
                  <strong>{slot.services?.duration_minutes || "--"} min</strong>
                </div>
                <div className={`${styles.stat} ${styles.statCenter}`}>
                  <span>Valor</span>
                  <strong>{price || "--"}</strong>
                </div>
              </div>
            </div>

            <div className={styles.participantsRow}>
              <div>
                <p className={styles.participantsLabel}>
                  {experience.communityTitle}
                </p>
                <p className={styles.participantsText}>
                  {participants.length > 0
                    ? `${participants.length} ${experience.participantLabel} confirmados`
                    : `Seja o primeiro entre os ${experience.participantLabel}.`}
                </p>
              </div>

              <AvatarStack participants={participants} />
            </div>

            <form action={reserveSlot} className={styles.slotAction}>
              <input name="company_id" type="hidden" value={companyId} />
              <input name="slot_id" type="hidden" value={slot.id} />
              <button
                className={styles.reserveButton}
                disabled={isFull}
                type="submit"
              >
                {isFull ? "Lotado" : `Reservar ${vocabulary.service_label}`}
              </button>
            </form>
          </article>
        );
      })}
    </div>
  );
}
