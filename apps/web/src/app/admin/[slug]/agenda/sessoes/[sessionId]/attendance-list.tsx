import Image from "next/image";

import type { SessionParticipant } from "../../../../../../types/saas";
import { updateAttendanceAction } from "../../../actions";
import styles from "../../../admin.module.css";

function statusLabel(status: SessionParticipant["status"]) {
  if (status === "attended") return "Presente";
  if (status === "missed") return "Faltou";
  return "Aguardando chamada";
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
        <li key={participant.id}>
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
              <small>{statusLabel(participant.status)}</small>
            </span>
          </div>
          <div className={styles.attendanceActions}>
            {(["attended", "missed"] as const).map((status) => (
              <form action={updateAttendanceAction} key={status}>
                <input name="bookingId" type="hidden" value={participant.id} />
                <input name="companyId" type="hidden" value={companyId} />
                <input name="sessionId" type="hidden" value={sessionId} />
                <input name="slug" type="hidden" value={slug} />
                <input name="status" type="hidden" value={status} />
                <button
                  className={participant.status === status ? styles.attendanceButtonActive : styles.attendanceButton}
                  type="submit"
                >
                  {status === "attended" ? "Presente" : "Faltou"}
                </button>
              </form>
            ))}
          </div>
        </li>
      ))}
    </ul>
  );
}
