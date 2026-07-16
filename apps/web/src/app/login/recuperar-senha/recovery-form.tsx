"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Alert, Button, Field, Spinner } from "../../../components/ui";
import { requestPasswordRecovery, type PasswordRecoveryState } from "./actions";
import styles from "../login.module.css";

const initialState: PasswordRecoveryState = {};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button disabled={pending} type="submit">
      {pending ? <Spinner label="Enviando" /> : "Enviar link de redefinição"}
    </Button>
  );
}

export function RecoveryForm() {
  const [state, formAction] = useActionState(
    requestPasswordRecovery,
    initialState,
  );

  return (
    <form action={formAction} className={styles.form}>
      <Field
        help="Por segurança, a resposta será a mesma mesmo se o e-mail não existir."
        label="E-mail"
      >
        <input
          autoComplete="email"
          className={styles.input}
          name="email"
          placeholder="voce@email.com"
          type="email"
        />
      </Field>

      <SubmitButton />

      {state.success ? (
        <Alert tone="success">{state.success}</Alert>
      ) : null}

      {state.error ? (
        <Alert tone="error">{state.error}</Alert>
      ) : null}
    </form>
  );
}
