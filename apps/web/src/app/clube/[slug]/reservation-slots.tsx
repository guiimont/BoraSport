"use client";

import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import type { ActivityExperience } from "../../../lib/saas/activity-presets";
import type {
  CompanySlot,
  CurrentUserBooking,
  SlotParticipant,
  VocabularyConfig,
} from "../../../types/saas";
import {
  type ReservationActionState,
  cancelSlotReservation,
  reserveSlot,
} from "./actions";
import styles from "./club-page.module.css";
import { ConfirmedParticipantsComposition } from "./confirmed-participants-composition";

type ReservationSlotsProps = {
  companyId: string;
  currentUserBookings: CurrentUserBooking[];
  experience: ActivityExperience;
  participantsBySlot: Record<string, SlotParticipant[]>;
  slug: string;
  slots: CompanySlot[];
  vocabulary: Required<VocabularyConfig>;
};

const initialActionState: ReservationActionState = {};

function ReservationButton({
  idleLabel,
  pendingLabel,
  tone = "reserve",
}: {
  idleLabel: string;
  pendingLabel: string;
  tone?: "cancel" | "reserve";
}) {
  const { pending } = useFormStatus();

  return (
    <button
      aria-disabled={pending}
      className={`${styles.reserveButton} ${
        tone === "cancel" ? styles.cancelButton : ""
      }`}
      disabled={pending}
      type="submit"
    >
      {pending ? pendingLabel : idleLabel}
    </button>
  );
}

function ReservationActionForm({
  companyId,
  isFull,
  isWaitlisted,
  mode,
  slug,
  slotId,
  vocabulary,
  waitlistPosition,
}: {
  companyId: string;
  isFull: boolean;
  isWaitlisted: boolean;
  mode: "cancel" | "reserve";
  slug: string;
  slotId: string;
  vocabulary: Required<VocabularyConfig>;
  waitlistPosition?: number | null;
}) {
  const [state, action] = useActionState(
    mode === "cancel" ? cancelSlotReservation : reserveSlot,
    initialActionState,
  );
  const idleLabel =
    mode === "cancel"
      ? isWaitlisted
        ? `Sair da lista · posição ${waitlistPosition ?? "--"}`
        : "Cancelar reserva"
      : isFull
        ? "Entrar na lista de espera"
        : `Reservar ${vocabulary.service_label}`;

  return (
    <form
      action={action}
      className={styles.slotAction}
      onSubmit={(event) => {
        if (
          mode === "cancel" &&
          !window.confirm(
            isWaitlisted
              ? "Sair da lista de espera deste horário?"
              : "Cancelar sua reserva neste horário?",
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <input name="company_id" type="hidden" value={companyId} />
      <input name="slot_id" type="hidden" value={slotId} />
      <input name="slug" type="hidden" value={slug} />
      <ReservationButton
        idleLabel={idleLabel}
        pendingLabel={mode === "cancel" ? "Cancelando..." : "Reservando..."}
        tone={mode === "cancel" ? "cancel" : "reserve"}
      />
      {state.error ? (
        <p aria-live="polite" className={styles.reservationError} role="status">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p aria-live="polite" className={styles.reservationSuccess} role="status">
          {state.success}
        </p>
      ) : null}
    </form>
  );
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function dayKey(value: string) {
  return new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
    year: "numeric",
  }).format(new Date(value));
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function parseDateKey(value: string) {
  return new Date(`${value}T12:00:00-03:00`);
}

function weekStartKey(value: string) {
  const local = parseDateKey(dayKey(value));
  const weekday = local.getDay();
  local.setDate(local.getDate() + (weekday === 0 ? -6 : 1 - weekday));
  return dayKey(local.toISOString());
}

function formatWeekRange(startKey: string) {
  const start = parseDateKey(startKey);
  const end = addDays(start, 6);
  const formatter = new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "long",
    timeZone: "America/Sao_Paulo",
  });
  return `${formatter.format(start)} a ${formatter.format(end)}`;
}

const weekdayFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  weekday: "long",
});

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

export function ReservationSlots({
  companyId,
  currentUserBookings,
  experience,
  participantsBySlot,
  slug,
  slots,
  vocabulary,
}: ReservationSlotsProps) {
  const bookingsBySlot = new Map(
    currentUserBookings.map((booking) => [booking.slot_id, booking]),
  );
  const firstWeekKey = slots[0]
    ? weekStartKey(slots[0].start_time)
    : weekStartKey(new Date().toISOString());
  const [selectedWeekKey, setSelectedWeekKey] = useState(firstWeekKey);
  const weekDays = useMemo(() => {
    const start = parseDateKey(selectedWeekKey);
    return Array.from({ length: 7 }, (_, index) => {
      const date = addDays(start, index);
      return { date, key: dayKey(date.toISOString()) };
    });
  }, [selectedWeekKey]);
  const slotsByDay = useMemo(() => {
    const grouped = new Map<string, CompanySlot[]>();
    for (const slot of slots) {
      const key = dayKey(slot.start_time);
      grouped.set(key, [...(grouped.get(key) || []), slot]);
    }
    return grouped;
  }, [slots]);

  if (slots.length === 0) {
    return (
      <div className={styles.emptyState}>
        Nenhum {vocabulary.service_label.toLowerCase()} disponível para os
        próximos dias.
      </div>
    );
  }

  return (
    <div className={styles.publicAgenda}>
      <div className={styles.publicAgendaNav}>
        <div>
          <span>Semana</span>
          <strong>{formatWeekRange(selectedWeekKey)}</strong>
        </div>
        <nav aria-label="Navegação da agenda">
          <button
            onClick={() =>
              setSelectedWeekKey(
                dayKey(addDays(parseDateKey(selectedWeekKey), -7).toISOString()),
              )
            }
            type="button"
          >
            ← Anterior
          </button>
          <button onClick={() => setSelectedWeekKey(firstWeekKey)} type="button">
            Próximos treinos
          </button>
          <button
            onClick={() =>
              setSelectedWeekKey(
                dayKey(addDays(parseDateKey(selectedWeekKey), 7).toISOString()),
              )
            }
            type="button"
          >
            Próxima →
          </button>
        </nav>
      </div>

      <div className={styles.publicWeekBoard}>
        {weekDays.map(({ date, key }) => {
          const daySlots = slotsByDay.get(key) || [];

          return (
            <section className={styles.publicDayColumn} key={key}>
              <header>
                <span>{weekdayFormatter.format(date).replace("-feira", "")}</span>
                <strong>{date.getDate().toString().padStart(2, "0")}</strong>
              </header>
              <div className={styles.publicDayBody}>
                {daySlots.length ? daySlots.map((slot) => {
              const remaining = Math.max(
                0,
                Number(slot.spots_total || 0) - Number(slot.spots_occupied || 0),
              );
              const price = formatCurrency(slot.services?.price);
              const isFull = remaining === 0;
              const participants = participantsBySlot[slot.id] || [];
              const currentUserBooking = bookingsBySlot.get(slot.id);
              const isConfirmedByCurrentUser =
                currentUserBooking?.status === "confirmed";
              const isWaitlistedByCurrentUser =
                currentUserBooking?.status === "waitlisted";
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
                    <details className={styles.publicSlotCard} key={slot.id}>
                      <summary>
                        <div className={styles.publicSlotTime}>
                          <strong>{formatTime(slot.start_time)}</strong>
                          <span>{slot.services?.duration_minutes || "--"} min</span>
                        </div>
                        <h3>{slot.services?.name || vocabulary.service_label}</h3>
                        <p>{slot.resources?.name || "Canoa a definir"}</p>
                        <div className={styles.publicSlotCapacity}>
                          <span>{occupied}/{slot.spots_total} confirmados</span>
                          <span data-full={isFull}>{remainingLabel}</span>
                        </div>
                        <small>Abrir canoa e participantes</small>
                      </summary>
                      <div className={styles.publicSlotExpanded}>
                        <div className={styles.publicSlotMeta}>
                          <span>Base</span>
                          <strong>{slot.company_locations?.name || "A definir"}</strong>
                          {price ? <em>{price}</em> : null}
                        </div>
                        <ConfirmedParticipantsComposition
                          capacity={slot.spots_total}
                          participantLabel={experience.participantLabel}
                          participants={participants}
                        />
                        <ReservationActionForm
                          companyId={companyId}
                          isFull={isFull}
                          isWaitlisted={isWaitlistedByCurrentUser}
                          mode={currentUserBooking ? "cancel" : "reserve"}
                          slug={slug}
                          slotId={slot.id}
                          vocabulary={vocabulary}
                          waitlistPosition={currentUserBooking?.waitlist_position}
                        />
                        {isConfirmedByCurrentUser ? (
                          <p className={styles.publicBookingStatus}>Sua vaga está confirmada.</p>
                        ) : null}
                        {isWaitlistedByCurrentUser ? (
                          <p className={styles.publicBookingStatus}>
                            Você está na posição {currentUserBooking.waitlist_position ?? "--"} da fila.
                          </p>
                        ) : null}
                      </div>
                    </details>
                  );
                }) : (
                  <div className={styles.publicDayEmpty}>
                    <strong>Dia livre</strong>
                    <span>Nenhum treino publicado.</span>
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
