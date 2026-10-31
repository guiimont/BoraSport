"use client";

import { useActionState } from "react";
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
import { ConfirmedParticipantsComposition } from "./confirmed-participants-composition";
import styles from "./club-page.module.css";

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
      className={`${styles.reserveButton} ${tone === "cancel" ? styles.cancelButton : ""}`}
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
        ? `Sair da fila · posição ${waitlistPosition ?? "--"}`
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
        ) event.preventDefault();
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
      {state.error ? <p className={styles.reservationError}>{state.error}</p> : null}
      {state.success ? <p className={styles.reservationSuccess}>{state.success}</p> : null}
    </form>
  );
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

function formatCurrency(value?: number | string | null) {
  if (value === null || value === undefined) return null;
  const amount = Number(value);
  if (amount === 0) return "Incluso";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(amount);
}

function groupByTime(slots: CompanySlot[]) {
  const grouped = new Map<string, CompanySlot[]>();
  for (const slot of slots) {
    const key = formatTime(slot.start_time);
    grouped.set(key, [...(grouped.get(key) || []), slot]);
  }
  return Array.from(grouped.entries());
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

  if (!slots.length) {
    return <div className={styles.emptyState}>Nenhum treino disponível para este dia.</div>;
  }

  return (
    <div className={styles.publicDayAgenda}>
      {groupByTime(slots).map(([time, timeSlots]) => (
        <section className={styles.publicTimeGroup} key={time}>
          <header>
            <div>
              <span>Horário</span>
              <strong>{time}</strong>
            </div>
            <p>
              {timeSlots.length} {timeSlots.length === 1 ? "canoa" : "canoas"} na água
            </p>
          </header>

          <div className={styles.publicCanoeRail}>
            {timeSlots.map((slot) => {
              const remaining = Math.max(0, slot.spots_total - slot.spots_occupied);
              const isFull = remaining === 0;
              const participants = participantsBySlot[slot.id] || [];
              const currentUserBooking = bookingsBySlot.get(slot.id);
              const isWaitlisted = currentUserBooking?.status === "waitlisted";
              const price = formatCurrency(slot.services?.price);

              return (
                <details className={styles.publicCanoeCard} key={slot.id}>
                  <summary>
                    <span className={styles.publicCanoeTag}>Canoa</span>
                    <h3>{slot.resources?.name || "A definir"}</h3>
                    <p>{slot.services?.name || vocabulary.service_label}</p>
                    <div className={styles.publicCanoeNumbers}>
                      <span><strong>{slot.spots_occupied}</strong> confirmados</span>
                      <span data-full={isFull}><strong>{remaining}</strong> vagas</span>
                    </div>
                    <small>Abrir canoa e participantes →</small>
                  </summary>

                  <div className={styles.publicCanoeExpanded}>
                    <div className={styles.publicCanoeMeta}>
                      <span>{slot.services?.duration_minutes || "--"} min</span>
                      <span>{slot.company_locations?.name || "Base a definir"}</span>
                      {price ? <span>{price}</span> : null}
                    </div>
                    <ConfirmedParticipantsComposition
                      capacity={slot.spots_total}
                      participantLabel={experience.participantLabel}
                      participants={participants}
                    />
                    <ReservationActionForm
                      companyId={companyId}
                      isFull={isFull}
                      isWaitlisted={isWaitlisted}
                      mode={currentUserBooking ? "cancel" : "reserve"}
                      slug={slug}
                      slotId={slot.id}
                      vocabulary={vocabulary}
                      waitlistPosition={currentUserBooking?.waitlist_position}
                    />
                    {currentUserBooking?.status === "confirmed" ? (
                      <p className={styles.publicBookingStatus}>Sua vaga está confirmada.</p>
                    ) : null}
                    {isWaitlisted ? (
                      <p className={styles.publicBookingStatus}>
                        Você está na posição {currentUserBooking?.waitlist_position ?? "--"} da fila.
                      </p>
                    ) : null}
                  </div>
                </details>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
