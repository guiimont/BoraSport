"use client";

import { useEffect } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";

import { ActionLink, Alert, Button, Field, Spinner } from "../../components/ui";
import { type LoginState, signInWithPassword } from "./actions";
import styles from "./login.module.css";

type LoginFormProps = {
  next: string;
};

const initialState: LoginState = {};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button disabled={pending} type="submit">
      {pending ? <Spinner label="Entrando" /> : "Entrar"}
    </Button>
  );
}

export function LoginForm({ next }: LoginFormProps) {
  const router = useRouter();
  const [state, formAction] = useActionState(signInWithPassword, initialState);

  useEffect(() => {
    if (state.redirectTo) {
      router.push(state.redirectTo);
    }
  }, [router, state.redirectTo]);

  return (
    <form action={formAction} className={styles.form}>
      <input name="next" type="hidden" value={next} />

      <Field help="Use o e-mail vinculado ao seu clube." label="E-mail">
        <input
          autoComplete="email"
          className={styles.input}
          name="email"
          placeholder="voce@email.com"
          type="email"
        />
      </Field>

      <Field label="Senha">
        <input
          autoComplete="current-password"
          className={styles.input}
          name="password"
          type="password"
        />
      </Field>

      <SubmitButton />

      <ActionLink href="/login/recuperar-senha" variant="ghost">
        Esqueci minha senha
      </ActionLink>

      {state.success ? (
        <Alert tone="success">{state.success}</Alert>
      ) : null}

      {state.error ? (
        <Alert tone="error">{state.error}</Alert>
      ) : null}
    </form>
  );
}
