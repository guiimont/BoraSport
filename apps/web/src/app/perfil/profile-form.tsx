"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { Alert, Button, Field, Spinner } from "../../components/ui";
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
    <Button disabled={pending} type="submit">
      {pending ? <Spinner label="Salvando" /> : "Salvar perfil"}
    </Button>
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
        <p>
          Esta é a imagem usada para identificar você nas reservas e listas de
          participantes quando o clube exibe presença.
        </p>
      </div>

      <Field label="Nome público">
        <input
          className={styles.input}
          defaultValue={profile?.name || ""}
          name="name"
          placeholder="Seu nome"
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

      <Field
        help="Use uma foto quadrada ou de rosto. O app recorta em formato circular nas listas de confirmados."
        label="Foto do perfil"
      >
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
      </Field>

      <Field
        help="Opcional. Use quando a foto já estiver publicada em uma URL segura."
        label="URL da foto alternativa"
      >
        <input
          className={styles.input}
          name="avatarUrl"
          onChange={(event) => setAvatarUrl(event.target.value)}
          placeholder="https://..."
          value={avatarUrl}
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
