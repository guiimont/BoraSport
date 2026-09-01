"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import type { CompanyLocation } from "../../../../types/saas";
import { saveCompanyLocation, type AdminFormState } from "../actions";
import styles from "../admin.module.css";

const initialState: AdminFormState = {};

function SubmitButton({ editing }: { editing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button className={styles.primaryButton} disabled={pending} type="submit">
      {pending ? "Salvando..." : editing ? "Salvar base" : "Cadastrar base"}
    </button>
  );
}

export function LocationForm({
  companyId,
  location,
  slug,
}: {
  companyId: string;
  location?: CompanyLocation;
  slug: string;
}) {
  const [state, action] = useActionState(saveCompanyLocation, initialState);

  return (
    <form action={action} className={styles.builderSectionCompact}>
      <input name="companyId" type="hidden" value={companyId} />
      <input name="slug" type="hidden" value={slug} />
      {location ? <input name="locationId" type="hidden" value={location.id} /> : null}

      <div className={styles.builderSectionIntro}>
        <span>{location ? "Base cadastrada" : "Nova base"}</span>
        <h2>{location?.name ?? "Identificação e acesso"}</h2>
        <p>Cadastre o local como ele deve aparecer para gestores e remadores.</p>
      </div>

      <div className={styles.builderGrid}>
        <label className={styles.label}>
          Nome da base
          <input className={styles.input} defaultValue={location?.name ?? ""} maxLength={100} name="name" placeholder="São Francisco" required />
        </label>
        <label className={styles.label}>
          Endereço ou ponto de encontro
          <input className={styles.input} defaultValue={location?.address ?? ""} maxLength={240} name="address" placeholder="Praia de São Francisco, Niterói" />
        </label>
      </div>

      <label className={styles.label}>
        Orientação pública
        <textarea className={styles.textarea} defaultValue={location?.public_notes ?? ""} maxLength={500} name="publicNotes" placeholder="Acesso pelo portão lateral. Chegue 15 minutos antes." rows={3} />
      </label>

      <label className={styles.baseResourceOption}>
        <input defaultChecked={location?.is_active ?? true} name="isActive" type="checkbox" />
        <span>
          <strong>Base ativa</strong>
          <small>Disponível para novos horários e sessões.</small>
        </span>
      </label>

      <div className={styles.builderStickyActions}>
        <SubmitButton editing={Boolean(location)} />
        <div aria-live="polite">
          {state.success ? <p className={styles.success}>{state.success}</p> : null}
          {state.error ? <p className={styles.error}>{state.error}</p> : null}
        </div>
      </div>
    </form>
  );
}
