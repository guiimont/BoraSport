"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";

import { type AdminFormState, claimCompanyAsAdmin } from "./actions";
import styles from "./admin.module.css";

type ClaimCompanyFormProps = {
  companyId: string;
  slug: string;
};

const initialState: AdminFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className={styles.primaryButton}
      disabled={pending}
      type="submit"
    >
      {pending ? "Assumindo..." : "Assumir como admin"}
    </button>
  );
}

export function ClaimCompanyForm({ companyId, slug }: ClaimCompanyFormProps) {
  const router = useRouter();
  const [state, formAction] = useActionState(
    claimCompanyAsAdmin,
    initialState,
  );

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [router, state.success]);

  return (
    <form action={formAction} className={styles.form}>
      <input name="companyId" type="hidden" value={companyId} />
      <input name="slug" type="hidden" value={slug} />

      <label className={styles.label}>
        Seu nome
        <input
          className={styles.input}
          name="name"
          placeholder="Nome do responsavel"
        />
      </label>

      <div className={styles.actionRow}>
        <SubmitButton />
        {state.success ? (
          <p className={styles.success}>{state.success}</p>
        ) : null}
        {state.error ? (
          <p className={styles.error}>{state.error}</p>
        ) : null}
      </div>
    </form>
  );
}
