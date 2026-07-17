"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { activityPresets } from "../../../lib/saas/activity-presets";
import type { VocabularyConfig } from "../../../types/saas";
import {
  type CompanyConfigurationState,
  saveCompanyConfiguration,
} from "./actions";
import styles from "./admin.module.css";

type CompanyConfigurationFormProps = {
  companyId: string;
  slug: string;
  typeDeNegocio: string;
  vocabulary: Required<VocabularyConfig>;
};

const initialState: CompanyConfigurationState = {};

const activityOptions = [
  ["canoa_havaiana", "Canoa havaiana"],
  ["crossfit", "Box de crossfit"],
  ["pilates", "Studio de pilates"],
  ["futvolei", "CT de futvolei"],
  ["esporte", "Esporte / aulas em grupo"],
  ["servicos", "Serviços com agenda"],
  ["generico", "Genérico"],
];

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className={styles.primaryButton}
      disabled={pending}
      type="submit"
    >
      {pending ? "Salvando..." : "Salvar configuracao"}
    </button>
  );
}

export function CompanyConfigurationForm({
  companyId,
  slug,
  typeDeNegocio,
  vocabulary,
}: CompanyConfigurationFormProps) {
  const router = useRouter();
  const [state, formAction] = useActionState(
    saveCompanyConfiguration,
    initialState,
  );
  const [formValues, setFormValues] = useState({
    bookingLabel: vocabulary.booking_label,
    professionalLabel: vocabulary.professional_label,
    resourceLabel: vocabulary.resource_label,
    serviceLabel: vocabulary.service_label,
    typeDeNegocio: typeDeNegocio || "generico",
  });
  const selectedPreset = useMemo(
    () =>
      activityPresets.find(
        (preset) => preset.type_de_negocio === formValues.typeDeNegocio,
      ),
    [formValues.typeDeNegocio],
  );

  function applyPreset(preset: (typeof activityPresets)[number]) {
    setFormValues({
      bookingLabel: preset.booking_label,
      professionalLabel: preset.professional_label,
      resourceLabel: preset.resource_label,
      serviceLabel: preset.service_label,
      typeDeNegocio: preset.type_de_negocio,
    });
  }

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [router, state.success]);

  return (
    <form action={formAction} className={styles.form}>
      <input name="companyId" type="hidden" value={companyId} />
      <input name="slug" type="hidden" value={slug} />

      <div className={styles.formGroup}>
        <p className={styles.label}>Presets de modalidade</p>
        <div className={styles.presetGrid}>
          {activityPresets.map((preset) => {
            const isSelected = preset.type_de_negocio === formValues.typeDeNegocio;

            return (
              <button
                className={
                  isSelected ? styles.presetButtonActive : styles.presetButton
                }
                key={preset.type_de_negocio}
                onClick={() => applyPreset(preset)}
                type="button"
              >
                {preset.service_label} / {preset.resource_label}
              </button>
            );
          })}
        </div>
      </div>

      <div className={styles.fieldGrid}>
        <label className={styles.label}>
          Tipo de atividade
          <select
            className={styles.select}
            name="typeDeNegocio"
            onChange={(event) =>
              setFormValues((current) => ({
                ...current,
                typeDeNegocio: event.target.value,
              }))
            }
            value={formValues.typeDeNegocio}
          >
            {activityOptions.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <div className={styles.infoBox}>
          {selectedPreset?.description ||
            "Essa escolha controla regras e blocos especificos do dominio."}{" "}
          O vocabulario abaixo troca os nomes do app sem criar uma versao
          separada para cada cliente.
        </div>
      </div>

      <div className={styles.fieldGridFour}>
        <label className={styles.label}>
          Recurso
          <input
            className={styles.input}
            name="resourceLabel"
            onChange={(event) =>
              setFormValues((current) => ({
                ...current,
                resourceLabel: event.target.value,
              }))
            }
            placeholder="Canoa, Cadeira, Quadra"
            value={formValues.resourceLabel}
          />
        </label>

        <label className={styles.label}>
          Profissional
          <input
            className={styles.input}
            name="professionalLabel"
            onChange={(event) =>
              setFormValues((current) => ({
                ...current,
                professionalLabel: event.target.value,
              }))
            }
            placeholder="Steerer, Coach, Professor"
            value={formValues.professionalLabel}
          />
        </label>

        <label className={styles.label}>
          Servico
          <input
            className={styles.input}
            name="serviceLabel"
            onChange={(event) =>
              setFormValues((current) => ({
                ...current,
                serviceLabel: event.target.value,
              }))
            }
            placeholder="Treino, Aula, Sessao"
            value={formValues.serviceLabel}
          />
        </label>

        <label className={styles.label}>
          Reserva
          <input
            className={styles.input}
            name="bookingLabel"
            onChange={(event) =>
              setFormValues((current) => ({
                ...current,
                bookingLabel: event.target.value,
              }))
            }
            placeholder="Reserva, Matricula"
            value={formValues.bookingLabel}
          />
        </label>
      </div>

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
