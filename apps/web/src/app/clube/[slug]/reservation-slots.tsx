"use client";

import { useActionState, useState } from "react";

import type { Slot } from "../../../types/saas";
import { requestReservation, type ReservationActionState } from "./actions";
import styles from "./page.module.css";

type ReservationSlotsProps = {
  clubId: string;
  formatDateTime: (value: string) => string;
  slots: Slot[];
};

const initialState: ReservationActionState = {
  message: "",
  status: "idle",
};

export function ReservationSlots({
  clubId,
  formatDateTime,
  slots,
}: ReservationSlotsProps) {
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [state, formAction, isPending] = useActionState(
    requestReservation,
    initialState,
  );

  return (
    <div className={styles.slotList}>
      {slots.map((slot) => {
        const isSelected = selectedSlotId === slot.id;
        const messageBelongsToSlot = state.slotId === slot.id;

        return (
          <article className={styles.slot} key={slot.id}>
            <div className={styles.slotSummary}>
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
                    <dd>
                      {slot.capacity} aluno{slot.capacity === 1 ? "" : "s"}
                    </dd>
                  </div>
                </dl>
              </div>

              <button
                className={styles.reserveButton}
                onClick={() => setSelectedSlotId(isSelected ? null : slot.id)}
                type="button"
              >
                Reservar
              </button>
            </div>

            {isSelected ? (
              <form action={formAction} className={styles.reservationForm}>
                <input name="club_id" type="hidden" value={clubId} />
                <input name="slot_id" type="hidden" value={slot.id} />

                <label>
                  Nome do aluno
                  <input
                    autoComplete="name"
                    name="customer_name"
                    required
                    type="text"
                  />
                </label>

                <label>
                  Telefone
                  <input
                    autoComplete="tel"
                    name="customer_phone"
                    required
                    type="tel"
                  />
                </label>

                <label>
                  E-mail
                  <input
                    autoComplete="email"
                    name="customer_email"
                    type="email"
                  />
                </label>

                <button
                  className={styles.submitButton}
                  disabled={isPending}
                  type="submit"
                >
                  {isPending ? "Enviando..." : "Solicitar reserva"}
                </button>

                {messageBelongsToSlot && state.status !== "idle" ? (
                  <p
                    className={
                      state.status === "success"
                        ? styles.successMessage
                        : styles.errorMessage
                    }
                  >
                    {state.message}
                  </p>
                ) : null}
              </form>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
