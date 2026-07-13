"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { type LoginState, sendMagicLink } from "./actions";
import styles from "./login.module.css";

type LoginFormProps = {
  next: string;
};

const initialState: LoginState = {};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className={styles.button}
      disabled={pending}
      type="submit"
    >
      {pending ? "Enviando..." : "Receber link de acesso"}
    </button>
  );
}

export function LoginForm({ next }: LoginFormProps) {
  const [state, formAction] = useActionState(sendMagicLink, initialState);

  return (
    <form action={formAction} className={styles.form}>
      <input name="next" type="hidden" value={next} />

      <label className={styles.label}>
        Email
        <input
          autoComplete="email"
          className={styles.input}
          name="email"
          placeholder="voce@empresa.com"
          type="email"
        />
      </label>

      <SubmitButton />

      {state.success ? (
        <p className={styles.success}>{state.success}</p>
      ) : null}

      {state.error ? (
        <p className={styles.error}>{state.error}</p>
      ) : null}
    </form>
  );
}
