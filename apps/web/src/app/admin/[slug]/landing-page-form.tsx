"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";

import { FileField } from "../../../components/ui";
import type { LandingPage } from "../../../types/saas";
import { type AdminFormState, saveLandingPage } from "./actions";
import styles from "./admin.module.css";

type LandingPageFormProps = {
  companyId: string;
  landingPage: LandingPage | null;
  slug: string;
};

const initialState: AdminFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button className={styles.primaryButton} disabled={pending} type="submit">
      {pending ? "Salvando..." : "Salvar landing page"}
    </button>
  );
}

export function LandingPageForm({
  companyId,
  landingPage,
  slug,
}: LandingPageFormProps) {
  const router = useRouter();
  const [state, formAction] = useActionState(saveLandingPage, initialState);
  const sections = landingPage?.sections || [];

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [router, state.success]);

  return (
    <form action={formAction} className={styles.form}>
      <input name="companyId" type="hidden" value={companyId} />
      <input name="slug" type="hidden" value={slug} />

      <div className={styles.fieldGridTwo}>
        <label className={styles.label}>
          Titulo
          <input
            className={styles.input}
            defaultValue={landingPage?.title || ""}
            name="landingTitle"
            placeholder="Unidos pelo Mar"
          />
        </label>

        <label className={styles.label}>
          Botao principal
          <input
            className={styles.input}
            defaultValue={landingPage?.cta_label || "Agendar agora"}
            name="landingCtaLabel"
          />
        </label>
      </div>

      <label className={styles.label}>
        Subtítulo
        <textarea
          className={styles.textarea}
          defaultValue={landingPage?.subtitle || ""}
          name="landingSubtitle"
          placeholder="Treinos de canoa havaiana em Niteroi para todos os niveis."
          rows={3}
        />
      </label>

      <div className={styles.fieldGridThree}>
        {[0, 1, 2].map((index) => (
          <label className={styles.label} key={index}>
            Bloco {index + 1}
            <textarea
              className={styles.textarea}
              defaultValue={String(sections[index]?.text || "")}
              name={`landingOffer${["One", "Two", "Three"][index]}`}
              rows={3}
            />
          </label>
        ))}
      </div>

      <div className={styles.fieldGridTwo}>
        <FileField
          accept="image/*"
          actionLabel="Selecionar imagem"
          label="Imagem principal"
          name="landingHeroImage"
        />

        <label className={styles.checkItem}>
          <input
            defaultChecked={landingPage?.is_published ?? true}
            name="landingPublished"
            type="checkbox"
          />
          Publicar em /site/{slug}
        </label>
      </div>

      <div className={styles.actionRow}>
        <SubmitButton />
        {state.success ? <p className={styles.success}>{state.success}</p> : null}
        {state.error ? <p className={styles.error}>{state.error}</p> : null}
      </div>
    </form>
  );
}
