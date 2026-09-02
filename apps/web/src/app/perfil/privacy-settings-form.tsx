"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Alert, Button, Spinner } from "../../components/ui";
import type { AthletePrivacySettings } from "../../types/saas";
import { type ProfileState, saveAthletePrivacySettings } from "./actions";
import styles from "./profile.module.css";

function SubmitButton() {
  const { pending } = useFormStatus();
  return <Button disabled={pending} type="submit" variant="secondary">{pending ? <Spinner label="Salvando" /> : "Salvar escolhas"}</Button>;
}

export function PrivacySettingsForm({ settings }: { settings: AthletePrivacySettings | null }) {
  const [state, action] = useActionState<ProfileState, FormData>(saveAthletePrivacySettings, {});

  return (
    <form action={action} className={styles.privacyForm}>
      <label className={styles.preferenceRow}>
        <span><strong>Participar de rankings</strong><small>Voluntário. Desativado por padrão.</small></span>
        <input defaultChecked={settings?.rankings_opt_in ?? false} name="rankingsOptIn" type="checkbox" />
      </label>
      <label className={styles.preferenceRow}>
        <span><strong>Participar de desafios</strong><small>Nenhuma inscrição automática.</small></span>
        <input defaultChecked={settings?.challenges_opt_in ?? false} name="challengesOptIn" type="checkbox" />
      </label>
      <div className={styles.rahuiSeal}><strong>Modo Rāhui Ativo 🛡️</strong><span>Ocultação de partida e chegada permanece obrigatória em trajetos compartilhados.</span></div>
      <SubmitButton />
      {state.success ? <Alert tone="success">{state.success}</Alert> : null}
      {state.error ? <Alert tone="error">{state.error}</Alert> : null}
    </form>
  );
}
