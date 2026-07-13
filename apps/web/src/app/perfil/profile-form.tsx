"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import type { Profile } from "../../types/saas";
import { type ProfileState, saveProfile } from "./actions";
import styles from "./profile.module.css";

type ProfileFormProps = {
  email: string;
  profile: Profile | null;
};

const initialState: ProfileState = {};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className={styles.submit}
      disabled={pending}
      type="submit"
    >
      {pending ? "Salvando..." : "Salvar perfil"}
    </button>
  );
}

export function ProfileForm({ email, profile }: ProfileFormProps) {
  const [state, formAction] = useActionState(saveProfile, initialState);
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || "");
  const [localPreview, setLocalPreview] = useState("");
  const displayName = profile?.name || email;
  const previewUrl = localPreview || avatarUrl;

  return (
    <form action={formAction} className={styles.form}>
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

      <label className={styles.field}>
        Nome publico
        <input
          className={styles.input}
          defaultValue={profile?.name || ""}
          name="name"
          placeholder="Seu nome"
        />
      </label>

      <label className={styles.field}>
        Telefone
        <input
          className={styles.input}
          defaultValue={profile?.phone || ""}
          name="phone"
          placeholder="(00) 00000-0000"
        />
      </label>

      <label className={styles.field}>
        Foto do perfil
        <input
          accept="image/*"
          className={styles.fileInput}
          name="avatarFile"
          onChange={(event) => {
            const file = event.target.files?.[0];

            setLocalPreview(file ? URL.createObjectURL(file) : "");
          }}
          type="file"
        />
        <p className={styles.hint}>
          Use uma foto quadrada ou de rosto. O app recorta em formato circular
          nas listas de confirmados.
        </p>
      </label>

      <label className={styles.field}>
        URL da foto alternativa
        <input
          className={styles.input}
          name="avatarUrl"
          onChange={(event) => setAvatarUrl(event.target.value)}
          placeholder="https://..."
          value={avatarUrl}
        />
      </label>

      <SubmitButton />

      {state.success ? (
        <p className={styles.success}>
          {state.success}
        </p>
      ) : null}

      {state.error ? (
        <p className={styles.error}>
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
