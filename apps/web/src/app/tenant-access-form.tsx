"use client";

import { FormEvent, useState } from "react";
import styles from "./home.module.css";

type TenantAccessFormProps = {
  mode: "public" | "admin";
};

export default function TenantAccessForm({ mode }: TenantAccessFormProps) {
  const [slug, setSlug] = useState("demo");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedSlug = slug.trim().toLowerCase();
    if (!normalizedSlug) {
      return;
    }

    window.location.href =
      mode === "admin" ? `/admin/${normalizedSlug}` : `/clube/${normalizedSlug}`;
  }

  return (
    <form className={styles.accessForm} onSubmit={handleSubmit}>
      <label className={styles.accessLabel} htmlFor={`tenant-${mode}`}>
        Slug do tenant
      </label>
      <div className={styles.accessRow}>
        <input
          id={`tenant-${mode}`}
          className={styles.accessInput}
          value={slug}
          onChange={(event) => setSlug(event.target.value)}
          placeholder="ex: demo"
          autoComplete="off"
        />
        <button className={styles.primaryButton} type="submit">
          {mode === "admin" ? "Abrir gestão" : "Abrir clube"}
        </button>
      </div>
      <p className={styles.hint}>
        {mode === "admin"
          ? "Área restrita para configurar operação, agenda e cadastros."
          : "Área pública para reservar horários e acompanhar a turma."}
      </p>
    </form>
  );
}
