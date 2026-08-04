"use client";

import Image from "next/image";
import { useActionState } from "react";

import type { SessionParticipant } from "../../../../../../types/saas";
import {
  type AdminFormState,
  updateAttendanceAction,
} from "../../../actions";
import styles from "../../../admin.module.css";

const initialState: AdminFormState = {};

function statusLabel(status: SessionParticipant["status"]) {
  if (status === "attended") return "Presente";
  if (status === "missed") return "Faltou";
  return "Aguardando chamada";
}

function AttendanceRow({
  companyId,
  participant,
  sessionId,
  slug,
}: {
  companyId: string;
  participant: SessionParticipant;
  sessionId: string;
  slug: string;
}) {
  const [state, formAction, isPending] = useActionState(
    updateAttendanceAction,
    initialState,
  );

  return (
    <li>
      <div className={styles.attendanceIdentity}>
        <span className={styles.attendanceAvatar}>
          {participant.profile?.avatar_url ? (
            <Image alt="" fill sizes="44px" src={participant.profile.avatar_url} />
          ) : (
            (participant.profile?.name || "R").slice(0, 1).toUpperCase()
          )}
        </span>
        <span>
          <strong>{participant.profile?.name || "Remador"}</strong>
          <small>{isPending ? "Salvando chamada..." : statusLabel(participant.status)}</small>
        </span>
      </div>

      <form action={formAction} className={styles.attendanceForm}>
        <input name="bookingId" type="hidden" value={participant.id} />
        <input name="companyId" type="hidden" value={companyId} />
        <input name="sessionId" type="hidden" value={sessionId} />
        <input name="slug" type="hidden" value={slug} />
        <div className={styles.attendanceActions}>
          {(["attended", "missed"] as const).map((status) => (
            <button
              aria-pressed={participant.status === status}
              className={
                participant.status === status
                  ? styles.attendanceButtonActive
                  : styles.attendanceButton
              }
              disabled={isPending || participant.status === status}
              key={status}
              name="status"
              type="submit"
              value={status}
            >
              {isPending
                ? "Salvando..."
                : status === "attended"
                  ? "Presente"
                  : "Faltou"}
            </button>
          ))}
        </div>
        {state.error ? (
          <p className={styles.attendanceError} role="alert">
            {state.error}
          </p>
        ) : null}
        {state.success ? (
          <p className={styles.attendanceSuccess} role="status">
            {state.success}
          </p>
        ) : null}
      </form>
    </li>
  );
}

export function AttendanceList({
  companyId,
  participants,
  sessionId,
  slug,
}: {
  companyId: string;
  participants: SessionParticipant[];
  sessionId: string;
  slug: string;
}) {
  if (!participants.length) {
    return <p className={styles.empty}>Nenhum remador reservado nesta sessão.</p>;
  }

  return (
    <ul className={styles.attendanceList}>
      {participants.map((participant) => (
        <AttendanceRow
          companyId={companyId}
          key={participant.id}
          participant={participant}
          sessionId={sessionId}
          slug={slug}
        />
      ))}
    </ul>
  );
}
