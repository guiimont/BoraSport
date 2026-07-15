"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Alert, Button, Field, Spinner } from "../../components/ui";
import { type LoginState, sendMagicLink } from "./actions";
import styles from "./login.module.css";

type LoginFormProps = {
  next: string;
};

const initialState: LoginState = {};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button disabled={pending} type="submit">
      {pending ? <Spinner label="Enviando" /> : "Receber link de acesso"}
    </Button>
  );
}

export function LoginForm({ next }: LoginFormProps) {
  const [state, formAction] = useActionState(sendMagicLink, initialState);

  return (
    <form action={formAction} className={styles.form}>
      <input name="next" type="hidden" value={next} />

      <Field
        help="Vamos enviar um link seguro para este endereço."
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
