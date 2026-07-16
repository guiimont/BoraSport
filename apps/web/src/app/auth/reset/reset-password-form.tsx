"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { ActionLink, Alert, Button, Field, Spinner } from "../../../components/ui";
import { type ResetPasswordState, updatePassword } from "./actions";
import styles from "../../login/login.module.css";

const initialState: ResetPasswordState = {};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button disabled={pending} type="submit">
      {pending ? <Spinner label="Salvando" /> : "Salvar nova senha"}
    </Button>
  );
}

export function ResetPasswordForm() {
  const [state, formAction] = useActionState(updatePassword, initialState);

  return (
    <form action={formAction} className={styles.form}>
      <Field help="Mínimo de 8 caracteres." label="Nova senha">
        <input
          autoComplete="new-password"
          className={styles.input}
          minLength={8}
          name="password"
          type="password"
        />
      </Field>

      <Field label="Confirmar nova senha">
        <input
          autoComplete="new-password"
          className={styles.input}
          minLength={8}
          name="passwordConfirmation"
          type="password"
        />
      </Field>

      <SubmitButton />

      {state.success ? (
        <>
          <Alert tone="success">{state.success}</Alert>
          <ActionLink href="/login" variant="secondary">
            Ir para o login
          </ActionLink>
        </>
      ) : null}

      {state.error ? (
        <Alert tone="error">{state.error}</Alert>
      ) : null}
    </form>
  );
}
