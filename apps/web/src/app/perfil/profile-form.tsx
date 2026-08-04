"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { Alert, Button, Field, FileField, Spinner } from "../../components/ui";
import type { Profile } from "../../types/saas";
import { type ProfileState, saveProfile } from "./actions";
import styles from "./profile.module.css";

type ProfileFormProps = {
  companyName?: string;
  email: string;
  profile: Profile | null;
};

const initialState: ProfileState = {};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button disabled={pending} type="submit">
      {pending ? <Spinner label="Salvando" /> : "Salvar perfil"}
    </Button>
  );
}

export function ProfileForm({ companyName, email, profile }: ProfileFormProps) {
  const [state, formAction] = useActionState(saveProfile, initialState);
  const [localPreview, setLocalPreview] = useState("");
  const hasValidName =
    Boolean(profile?.name?.trim()) && !profile?.name?.includes("@");
  const displayName = hasValidName ? profile!.name : "Seu perfil";
  const previewUrl = localPreview || profile?.avatar_url || "";

  return (
    <form action={formAction} className={styles.form}>
      <input name="avatarUrl" type="hidden" value={profile?.avatar_url || ""} />
      <div className={styles.avatarField}>
        <span className={styles.avatarLarge}>
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt={displayName}
              src={previewUrl}
            />
          ) : (
            displayName.slice(0, 1).toUpperCase()
          )}
        </span>
        <div className={styles.profileIntro}>
          <h2 id="profile-heading">{displayName}</h2>
          <p>{companyName || "Remador BoraSport"}</p>
        </div>
        <div className={styles.photoControl}>
          <FileField
            accept="image/*"
            actionLabel={previewUrl ? "Alterar foto" : "Adicionar foto"}
            label="Foto do perfil"
            name="avatarFile"
            onChange={(event) => {
              const file = event.target.files?.[0];

              setLocalPreview(file ? URL.createObjectURL(file) : "");
            }}
          />
          <span className={styles.fieldHelp}>
            Prefira uma foto de rosto, com boa iluminação.
          </span>
        </div>
      </div>

      <div className={styles.formHeading}>
        <p className={styles.eyebrow}>Dados pessoais</p>
        <h3>Suas informações</h3>
      </div>

      <Field label="Nome">
        <input
          autoComplete="name"
          className={styles.input}
          defaultValue={hasValidName ? profile?.name : ""}
          name="name"
          placeholder="Seu nome"
          required
        />
      </Field>

      <Field label="Telefone">
        <input
          autoComplete="tel"
          className={styles.input}
          defaultValue={profile?.phone || ""}
          name="phone"
          placeholder="(00) 00000-0000"
        />
      </Field>

      <Field label="E-mail">
        <input
          className={styles.input}
          disabled
          type="email"
          value={email}
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
