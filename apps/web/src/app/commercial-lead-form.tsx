"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  type CommercialLeadState,
  submitCommercialLead,
} from "./actions";
import styles from "./home.module.css";

const initialState: CommercialLeadState = {};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button className={styles.formButton} disabled={pending} type="submit">
      {pending ? "Enviando..." : "Solicitar demonstração"}
    </button>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <span className={styles.fieldError}>{message}</span>;
}

export function CommercialLeadForm() {
  const [state, formAction] = useActionState(
    submitCommercialLead,
    initialState,
  );

  return (
    <form action={formAction} className={styles.leadForm}>
      <div className={styles.honeypot} aria-hidden="true">
        <label htmlFor="contactFaxConfirmation">Confirmação de fax</label>
        <input
          autoComplete="off"
          aria-hidden="true"
          data-1p-ignore="true"
          data-lpignore="true"
          id="contactFaxConfirmation"
          name="contactFaxConfirmation"
          tabIndex={-1}
          type="text"
        />
      </div>

      <label className={styles.formField}>
        Nome
        <input
          autoComplete="name"
          name="name"
          required
          type="text"
        />
        <FieldError message={state.errors?.name} />
      </label>

      <label className={styles.formField}>
        Nome do clube
        <input
          autoComplete="organization"
          name="clubName"
          required
          type="text"
        />
        <FieldError message={state.errors?.clubName} />
      </label>

      <label className={styles.formField}>
        Função no clube
        <input
          autoComplete="organization-title"
          name="role"
          required
          type="text"
        />
        <FieldError message={state.errors?.role} />
      </label>

      <label className={styles.formField}>
        Cidade e estado
        <input
          autoComplete="address-level2"
          name="cityState"
          placeholder="Ex: Niteroi, RJ"
          required
          type="text"
        />
        <FieldError message={state.errors?.cityState} />
      </label>

      <label className={styles.formField}>
        WhatsApp
        <input
          autoComplete="tel"
          inputMode="tel"
          name="phone"
          required
          type="tel"
        />
        <FieldError message={state.errors?.phone} />
      </label>

      <label className={styles.formField}>
        E-mail
        <input
          autoComplete="email"
          name="email"
          required
          type="email"
        />
        <FieldError message={state.errors?.email} />
      </label>

      <label className={styles.formField}>
        Mensagem opcional
        <textarea
          maxLength={1200}
          name="message"
          rows={4}
        />
        <FieldError message={state.errors?.message} />
      </label>

      <label className={styles.consentField}>
        <input name="consent" required type="checkbox" />
        <span>
          Autorizo o contato do BoraSport para conversar sobre a operação do meu
          clube.
        </span>
      </label>
      <FieldError message={state.errors?.consent} />

      <SubmitButton />

      {state.message ? (
        <p
          className={state.success ? styles.formSuccess : styles.formError}
          aria-live="polite"
          role="status"
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
