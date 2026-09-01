"use client";

import { useEffect, useState, useTransition } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";

import { ActionLink, Alert, Button, Field, Spinner } from "../../components/ui";
import {
  acceptStoredInvite,
  type InviteContext,
  type InviteFormState,
  signUpWithInvite,
  storeInviteToken,
} from "./actions";
import styles from "./invite.module.css";

type InviteFlowProps = {
  initialContext: InviteContext;
  isAuthenticated: boolean;
};

const initialFormState: InviteFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button disabled={pending} type="submit">
      {pending ? <Spinner label="Criando conta" /> : "Criar conta e aceitar convite"}
    </Button>
  );
}

function AcceptButton() {
  const { pending } = useFormStatus();

  return (
    <Button disabled={pending} type="submit">
      {pending ? <Spinner label="Concluindo" /> : "Concluir acesso ao clube"}
    </Button>
  );
}

export function InviteFlow({
  initialContext,
  isAuthenticated,
}: InviteFlowProps) {
  const router = useRouter();
  const [context, setContext] = useState(initialContext);
  const [tokenMessage, setTokenMessage] = useState<string | null>(null);
  const [isReadingToken, startTokenTransition] = useTransition();
  const [signUpState, signUpAction] = useActionState(
    signUpWithInvite,
    initialFormState,
  );
  const [acceptState, acceptAction] = useActionState(
    async () => acceptStoredInvite(),
    initialFormState,
  );

  useEffect(() => {
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
    const token = params.get("token");

    if (!token) {
      return;
    }

    window.history.replaceState(null, "", window.location.pathname + window.location.search);
    setTokenMessage("Validando convite...");

    startTokenTransition(async () => {
      const nextContext = await storeInviteToken(token);
      setContext(nextContext);
      setTokenMessage(
        nextContext.status === "active"
          ? "Convite validado neste navegador."
          : nextContext.error || "Este convite não está disponível.",
      );
      router.refresh();
    });
  }, [router]);

  useEffect(() => {
    const redirectTo = signUpState.redirectTo || acceptState.redirectTo;

    if (redirectTo) {
      router.push(redirectTo);
    }
  }, [acceptState.redirectTo, router, signUpState.redirectTo]);

  const hasActiveInvite = context.status === "active";

  return (
    <div className={styles.form}>
      {context.companyName ? (
        <div className={styles.clubCard}>
          <span>Convite do clube</span>
          <strong>{context.companyName}</strong>
        </div>
      ) : null}

      {tokenMessage ? (
        <Alert tone={hasActiveInvite ? "success" : "warning"}>
          {isReadingToken ? "Validando convite..." : tokenMessage}
        </Alert>
      ) : null}

      {!hasActiveInvite ? (
        <Alert tone="warning">
          {context.error ||
            "Abra o convite original enviado pelo clube para continuar."}
        </Alert>
      ) : null}

      {isAuthenticated ? (
        <form action={acceptAction} className={styles.form}>
          <p className={styles.muted}>
            Você já está conectado. Conclua o convite para liberar seu acesso ao
            clube.
          </p>
          <AcceptButton />
          {acceptState.success ? (
            <Alert tone="success">{acceptState.success}</Alert>
          ) : null}
          {acceptState.error ? (
            <Alert tone="error">{acceptState.error}</Alert>
          ) : null}
        </form>
      ) : (
        <>
          <form action={signUpAction} className={styles.form}>
            <Field
              help="Use o nome que o clube deve ver nas reservas e treinos."
              label="Nome"
            >
              <input
                autoComplete="name"
                className={styles.input}
                name="name"
                required
                type="text"
              />
            </Field>

            <Field label="E-mail">
              <input
                autoComplete="email"
                className={styles.input}
                name="email"
                required
                type="email"
              />
            </Field>

            <Field
              help="Dado privado: somente você poderá consultar o valor. O clube e os treinadores não terão acesso."
              label="Peso atual (kg)"
            >
              <input
                className={styles.input}
                inputMode="decimal"
                max="350"
                min="20"
                name="weightKg"
                placeholder="Ex.: 78,5"
                required
                step="0.1"
                type="number"
              />
            </Field>

            <Field help="Mínimo de 8 caracteres." label="Senha">
              <input
                autoComplete="new-password"
                className={styles.input}
                minLength={8}
                name="password"
                required
                type="password"
              />
            </Field>

            <Field label="Confirmar senha">
              <input
                autoComplete="new-password"
                className={styles.input}
                minLength={8}
                name="passwordConfirmation"
                required
                type="password"
              />
            </Field>

            <SubmitButton />

            {signUpState.success ? (
              <Alert tone="success">{signUpState.success}</Alert>
            ) : null}
            {signUpState.error ? (
              <Alert tone="error">{signUpState.error}</Alert>
            ) : null}
          </form>

          <div className={styles.divider}>ou</div>

          <div className={styles.actions}>
            <ActionLink href="/login?next=/convite" variant="secondary">
              Já tenho conta
            </ActionLink>
          </div>
        </>
      )}
    </div>
  );
}
