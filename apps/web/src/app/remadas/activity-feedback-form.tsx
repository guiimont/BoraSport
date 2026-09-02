"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import type { ActivityRecord } from "../../types/saas";
import { saveActivityFeedback, type ActivityFeedbackState } from "./actions";
import styles from "./remadas.module.css";

const initialState: ActivityFeedbackState = {};

function SubmitButton({ hasFeedback }: { hasFeedback: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button className={styles.feedbackSubmit} disabled={pending} type="submit">
      {pending ? "Salvando..." : hasFeedback ? "Atualizar retorno" : "Salvar retorno"}
    </button>
  );
}

export function ActivityFeedbackForm({ activity }: { activity: ActivityRecord }) {
  const [state, action] = useActionState(saveActivityFeedback, initialState);

  return (
    <details className={styles.feedback} open={!activity.athlete_feedback_at}>
      <summary>
        <span>
          <strong>Como foi esta remada?</strong>
          <small>{activity.athlete_feedback_at ? "Retorno enviado" : "Leva menos de 30 segundos"}</small>
        </span>
        <span aria-hidden>+</span>
      </summary>
      <form action={action} className={styles.feedbackForm}>
        <input name="activityId" type="hidden" value={activity.id} />
        <fieldset>
          <legend>Esforço percebido</legend>
          <div className={styles.rpeScale}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
              <label key={value}>
                <input defaultChecked={activity.athlete_rpe === value} name="rpe" required type="radio" value={value} />
                <span>{value}</span>
              </label>
            ))}
          </div>
          <small>1 muito leve · 10 máximo</small>
        </fieldset>
        <label>
          Como você terminou?
          <select defaultValue={activity.athlete_feeling ?? ""} name="feeling" required>
            <option disabled value="">Selecione</option>
            <option value="great">Muito bem</option>
            <option value="good">Bem</option>
            <option value="neutral">Normal</option>
            <option value="tired">Cansado</option>
            <option value="exhausted">Esgotado</option>
          </select>
        </label>
        <label className={styles.painCheck}>
          <input defaultChecked={activity.athlete_pain ?? false} name="pain" type="checkbox" />
          Senti dor ou desconforto
        </label>
        <label>
          Observação opcional
          <textarea defaultValue={activity.athlete_notes ?? ""} maxLength={600} name="notes" placeholder="Algo que o treinador precisa saber?" rows={3} />
        </label>
        <SubmitButton hasFeedback={Boolean(activity.athlete_feedback_at)} />
        {state.error ? <p role="alert">{state.error}</p> : null}
        {state.success ? <p role="status">{state.success}</p> : null}
      </form>
    </details>
  );
}
