"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Alert, Button, Field, FileField, Spinner } from "../../components/ui";
import type { MembershipWithCompany } from "../../types/saas";
import { type ActivityFormState, saveActivity } from "./actions";
import styles from "./remadas.module.css";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button disabled={pending} type="submit">
      {pending ? <Spinner label="Processando" /> : "Hoe! · Registrar Remada"}
    </Button>
  );
}

export function ActivityForm({ memberships }: { memberships: MembershipWithCompany[] }) {
  const [state, action] = useActionState<ActivityFormState, FormData>(saveActivity, {});

  return (
    <form action={action} className={styles.form}>
      <div className={styles.formIntro}>
        <p className={styles.eyebrow}>Menos digitação</p>
        <h2>Hoe! · Registrar Remada</h2>
        <p>FIT, GPX e TCX são lidos automaticamente. Sem arquivo, preencha só o essencial.</p>
      </div>

      <FileField
        accept=".fit,.gpx,.tcx,application/gpx+xml,application/vnd.garmin.tcx+xml"
        actionLabel="Escolher arquivo"
        label="Arquivo do relógio ou aplicativo (opcional)"
        name="activityFile"
      />

      <Field label="Nome da remada" help="Opcional. Se houver arquivo, usamos o nome disponível nele.">
        <input className={styles.input} name="title" placeholder="Ex.: Volta do Forte" />
      </Field>

      <div className={styles.twoColumns}>
        <Field label="Data e hora">
          <input className={styles.input} name="startedAt" type="datetime-local" />
        </Field>
        <Field label="Organização">
          <select className={styles.input} defaultValue="" name="companyId">
            <option value="">Remada pessoal</option>
            {memberships.map((membership) =>
              membership.companies ? (
                <option key={membership.id} value={membership.company_id}>
                  {membership.companies.name}
                </option>
              ) : null,
            )}
          </select>
        </Field>
      </div>

      <div className={styles.twoColumns}>
        <Field label="Distância (km)">
          <input className={styles.input} inputMode="decimal" min="0" name="distanceKm" placeholder="Ex.: 8,4" step="0.01" type="number" />
        </Field>
        <Field label="Duração (minutos)">
          <input className={styles.input} inputMode="numeric" min="0" name="durationMinutes" placeholder="Ex.: 65" step="1" type="number" />
        </Field>
      </div>

      <Field label="Privacidade">
        <select className={styles.input} defaultValue="private" name="visibility">
          <option value="private">Somente eu</option>
          <option value="organization">Compartilhar com a organização selecionada</option>
        </select>
      </Field>

      <p className={styles.help}>Ao enviar um arquivo, os dados extraídos substituem data, distância e duração digitadas. O arquivo bruto não fica público.</p>
      <SubmitButton />
      {state.success ? <Alert tone="success">{state.success}</Alert> : null}
      {state.error ? <Alert tone="error">{state.error}</Alert> : null}
    </form>
  );
}
