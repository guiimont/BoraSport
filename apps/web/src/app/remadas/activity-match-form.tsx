"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Alert, Button, Spinner } from "../../components/ui";
import type { ActivitySessionCandidate } from "../../types/saas";
import {
  type ActivityMatchState,
  linkActivityToSession,
} from "./actions";
import styles from "./remadas.module.css";

const date = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  timeZone: "America/Sao_Paulo",
});

function MatchButton() {
  const { pending } = useFormStatus();
  return (
    <Button disabled={pending} type="submit" variant="secondary">
      {pending ? <Spinner label="Vinculando" /> : "Validar presença"}
    </Button>
  );
}

export function ActivityMatchForm({
  activityId,
  candidates,
}: {
  activityId: string;
  candidates: ActivitySessionCandidate[];
}) {
  const [state, action] = useActionState<ActivityMatchState, FormData>(
    linkActivityToSession,
    {},
  );

  return (
    <form action={action} className={styles.matchForm}>
      <input name="activityId" type="hidden" value={activityId} />
      <label>
        <span>Vincular à sessão</span>
        <select className={styles.input} defaultValue="" name="sessionId" required>
          <option disabled value="">
            Escolha na agenda
          </option>
          {candidates.map((session) => (
            <option key={session.id} value={session.id}>
              {date.format(new Date(`${session.session_date}T12:00:00-03:00`))} · {session.start_time.slice(0, 5)} · {session.group_name} · {session.company_name}
            </option>
          ))}
        </select>
      </label>
      <MatchButton />
      {state.success ? <Alert tone="success">{state.success}</Alert> : null}
      {state.error ? <Alert tone="error">{state.error}</Alert> : null}
    </form>
  );
}
