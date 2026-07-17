"use client";

import type { ActivityExperience } from "../../../lib/saas/activity-presets";
import type {
  CompanySlot,
  SlotParticipant,
  VocabularyConfig,
} from "../../../types/saas";
import { cancelSlotReservation, reserveSlot } from "./actions";
import styles from "./club-page.module.css";
import { ConfirmedParticipantsComposition } from "./confirmed-participants-composition";

type ReservationSlotsProps = {
  companyId: string;
  currentUserBookedSlotIds: string[];
  experience: ActivityExperience;
  participantsBySlot: Record<string, SlotParticipant[]>;
  slug: string;
  slots: CompanySlot[];
  vocabulary: Required<VocabularyConfig>;
};

function formatTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDayHeading(value: string) {
  const label = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(new Date(value));

  return label.charAt(0).toUpperCase() + label.slice(1);
}

function dayKey(value: string) {
  return new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
    year: "numeric",
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

function groupSlotsByDay(slots: CompanySlot[]) {
  const grouped = new Map<string, { heading: string; slots: CompanySlot[] }>();

  for (const slot of slots) {
    const key = dayKey(slot.start_time);
    const current = grouped.get(key) || {
      heading: formatDayHeading(slot.start_time),
      slots: [],
    };
    current.slots.push(slot);
    grouped.set(key, current);
  }

  return Array.from(grouped.values());
}

export function ReservationSlots({
  companyId,
  currentUserBookedSlotIds,
  experience,
  participantsBySlot,
  slug,
  slots,
  vocabulary,
}: ReservationSlotsProps) {
  const bookedSlotIds = new Set(currentUserBookedSlotIds);

  if (slots.length === 0) {
    return (
      <div className={styles.emptyState}>
        Nenhum {vocabulary.service_label.toLowerCase()} disponível para os
        próximos dias.
      </div>
    );
  }

  const slotsByDay = groupSlotsByDay(slots);

  return (
    <div className={styles.scheduleDays}>
      {slotsByDay.map((day) => (
        <section className={styles.scheduleDay} key={day.heading}>
          <h3 className={styles.dayHeading}>{day.heading}</h3>

          <div className={styles.slotList}>
            {day.slots.map((slot) => {
              const remaining = Math.max(
                0,
                Number(slot.spots_total || 0) - Number(slot.spots_occupied || 0),
              );
              const price = formatCurrency(slot.services?.price);
              const isFull = remaining === 0;
              const participants = participantsBySlot[slot.id] || [];
              const isBookedByCurrentUser = bookedSlotIds.has(slot.id);
              const occupied = Math.min(
                Number(slot.spots_occupied || 0),
                Number(slot.spots_total || 0),
              );
              const remainingLabel =
                remaining === 0
                  ? "Lotado"
                  : `${remaining} ${
                      remaining === 1 ? "vaga restante" : "vagas restantes"
                    }`;

              return (
                <article className={styles.slotCard} key={slot.id}>
                  <div className={styles.slotMain}>
                    <div className={styles.slotIdentity}>
                      <time className={styles.slotTime} dateTime={slot.start_time}>
                        {formatTime(slot.start_time)}
                      </time>

                      <div className={styles.slotHeading}>
                        <h4 className={styles.slotTitle}>
                          {slot.services?.name || vocabulary.service_label}
                        </h4>
                        <p className={styles.slotMeta}>
                          {vocabulary.resource_label}:{" "}
                          <strong>{slot.resources?.name || "A definir"}</strong>
                        </p>
                      </div>
                    </div>

                    <div className={styles.slotSummary}>
                      <span className={styles.capacityPill}>
                        {occupied}/{slot.spots_total} confirmados
                      </span>
                      <span
                        className={`${styles.capacityPill} ${
                          isFull ? styles.capacityPillFull : ""
                        }`}
                      >
                        {remainingLabel}
                      </span>
                      <span className={styles.durationText}>
                        {slot.services?.duration_minutes || "--"} min
                        {price ? ` · ${price}` : ""}
                      </span>
                    </div>
                  </div>

                  <div className={styles.participantsBlock}>
                    <ConfirmedParticipantsComposition
                      capacity={slot.spots_total}
                      participantLabel={experience.participantLabel}
                      participants={participants}
                    />
                  </div>

                  {isBookedByCurrentUser ? (
                    <form
                      action={cancelSlotReservation}
                      className={styles.slotAction}
                    >
                      <input name="company_id" type="hidden" value={companyId} />
                      <input name="slot_id" type="hidden" value={slot.id} />
                      <input name="slug" type="hidden" value={slug} />
                      <button
                        className={`${styles.reserveButton} ${styles.cancelButton}`}
                        type="submit"
                      >
                        Cancelar reserva
                      </button>
                    </form>
                  ) : (
                    <form action={reserveSlot} className={styles.slotAction}>
                      <input name="company_id" type="hidden" value={companyId} />
                      <input name="slot_id" type="hidden" value={slot.id} />
                      <input name="slug" type="hidden" value={slug} />
                      <button
                        className={styles.reserveButton}
                        disabled={isFull}
                        type="submit"
                      >
                        {isFull
                          ? "Lotado"
                          : `Reservar ${vocabulary.service_label}`}
                      </button>
                    </form>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
