"use client";

import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";

import type {
  DefaultSteererPolicy,
  Resource,
  VesselClass,
  VesselStatus,
} from "../../../../types/saas";
import {
  saveResource,
  saveResourceOperation,
  type AdminFormState,
} from "../actions";
import styles from "../admin.module.css";

type CanoaOperationalFormProps = {
  companyId: string;
  resource?: Resource;
  resourceLabel: string;
  slug: string;
};

const initialState: AdminFormState = {};

const vesselOptions: Array<{ label: string; value: VesselClass }> = [
  { label: "V1", value: "v1" },
  { label: "OC1", value: "oc1" },
  { label: "V3", value: "v3" },
  { label: "OC4", value: "oc4" },
  { label: "V6", value: "v6" },
  { label: "OC6", value: "oc6" },
  { label: "Outro", value: "outro" },
];

const vesselStatusOptions: Array<{ label: string; value: VesselStatus }> = [
  { label: "Disponível", value: "disponivel" },
  { label: "Em manutenção", value: "manutencao" },
  { label: "Inativa", value: "inativa" },
];

const steererPolicyOptions: Array<{
  description: string;
  label: string;
  value: DefaultSteererPolicy;
}> = [
  {
    description: "O instrutor ocupa um assento e reduz uma vaga pública.",
    label: "Instrutor como leme",
    value: "instrutor",
  },
  {
    description: "Um aluno reserva normalmente e será identificado como leme.",
    label: "Aluno como leme",
    value: "aluno",
  },
  {
    description: "A decisão fica pendente para cada treino publicado.",
    label: "Definir em cada treino",
    value: "definir_treino",
  },
];

const knownCapacities: Record<Exclude<VesselClass, "outro">, number> = {
  oc1: 1,
  oc4: 4,
  oc6: 6,
  v1: 1,
  v3: 3,
  v6: 6,
};

const vesselLabels: Record<VesselClass, string> = {
  oc1: "OC1",
  oc4: "OC4",
  oc6: "OC6",
  outro: "Outro",
  v1: "V1",
  v3: "V3",
  v6: "V6",
};

const statusLabels: Record<VesselStatus, string> = {
  disponivel: "Disponível",
  inativa: "Inativa",
  manutencao: "Em manutenção",
};

const steererLabels: Record<DefaultSteererPolicy, string> = {
  aluno: "Aluno como leme",
  definir_treino: "Definir em cada treino",
  instrutor: "Instrutor como leme",
};

function SubmitButton({ isEditing }: { isEditing: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button className={styles.primaryButton} disabled={pending} type="submit">
      {pending ? "Salvando..." : isEditing ? "Salvar canoa" : "Cadastrar canoa"}
    </button>
  );
}

function Feedback({ state }: { state: AdminFormState }) {
  if (state.success) {
    return <p className={styles.success}>{state.success}</p>;
  }

  if (state.error) {
    return <p className={styles.error}>{state.error}</p>;
  }

  return null;
}

function isSingleClass(vesselClass: VesselClass) {
  return vesselClass === "v1" || vesselClass === "oc1";
}

function getCapacity(vesselClass: VesselClass, customCapacity: number) {
  return vesselClass === "outro" ? customCapacity : knownCapacities[vesselClass];
}

function getPublicSpots(
  capacity: number,
  policy: DefaultSteererPolicy | null,
) {
  if (policy === "instrutor") {
    return Math.max(0, capacity - 1);
  }

  return capacity;
}

export function CanoaOperationalForm({
  companyId,
  resource,
  resourceLabel,
  slug,
}: CanoaOperationalFormProps) {
  const [createState, createAction] = useActionState(saveResource, initialState);
  const [updateState, updateAction] = useActionState(
    saveResourceOperation,
    initialState,
  );
  const action = resource ? updateAction : createAction;
  const state = resource ? updateState : createState;
  const [vesselClass, setVesselClass] = useState<VesselClass>(
    resource?.vessel_class ?? "v6",
  );
  const [customCapacity, setCustomCapacity] = useState(
    resource?.vessel_class === "outro" ? resource.capacity_maxima : 1,
  );
  const [steererPolicy, setSteererPolicy] =
    useState<DefaultSteererPolicy>(
      resource?.default_steerer_policy ?? "definir_treino",
    );
  const [vesselStatus, setVesselStatus] = useState<VesselStatus>(
    resource?.vessel_status ?? (resource?.is_active === false ? "inativa" : "disponivel"),
  );

  const capacity = useMemo(
    () => getCapacity(vesselClass, customCapacity),
    [customCapacity, vesselClass],
  );
  const collective = !isSingleClass(vesselClass) && capacity > 1;
  const effectiveSteererPolicy = collective ? steererPolicy : null;
  const publicSpots = getPublicSpots(capacity, effectiveSteererPolicy);

  return (
    <form action={action} className={styles.builderLayout}>
      <input name="companyId" type="hidden" value={companyId} />
      <input name="resourceLabel" type="hidden" value={resourceLabel} />
      <input name="slug" type="hidden" value={slug} />
      {resource ? (
        <input name="resourceId" type="hidden" value={resource.id} />
      ) : null}

      <div className={styles.builderMain}>
        <section className={styles.builderHero}>
          <p className={styles.eyebrow}>Operação</p>
          <h2>{resource ? "Editar canoa" : "Nova canoa operacional"}</h2>
          <p>
            Defina classe, capacidade real e regra de leme para preparar a
            agenda semanal sem alterar reservas existentes.
          </p>
        </section>

        <section className={styles.builderSectionCompact}>
          <div className={styles.builderSectionIntro}>
            <span>Identidade</span>
            <h2>Dados principais</h2>
            <p>Nome público da canoa e identificação interna opcional.</p>
          </div>
          <div className={styles.builderGrid}>
            <label className={styles.label}>
              Nome
              <input
                className={styles.input}
                defaultValue={resource?.name ?? ""}
                name="name"
                placeholder="V6 Hoku"
                required
              />
            </label>
            <label className={styles.label}>
              Identificacao interna
              <input
                className={styles.input}
                defaultValue={resource?.internal_code ?? ""}
                name="internalCode"
                placeholder="Frota 01, casco azul..."
              />
            </label>
          </div>
        </section>

        <section className={styles.builderSectionCompact}>
          <div className={styles.builderSectionIntro}>
            <span>Capacidade</span>
            <h2>Classe e operação</h2>
            <p>
              Classes conhecidas calculam a capacidade automaticamente. Use
              Outro apenas para uma embarcação fora do padrão.
            </p>
          </div>
          <div className={styles.builderGridThree}>
            <label className={styles.label}>
              Classe
              <select
                className={styles.select}
                name="vesselClass"
                onChange={(event) =>
                  setVesselClass(event.target.value as VesselClass)
                }
                value={vesselClass}
              >
                {vesselOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.label}>
              Capacidade
              <input
                className={styles.input}
                disabled={vesselClass !== "outro"}
                min="1"
                name="capacityMaxima"
                onChange={(event) =>
                  setCustomCapacity(Math.max(0, Number(event.target.value)))
                }
                required={vesselClass === "outro"}
                type="number"
                value={capacity}
              />
            </label>
            <label className={styles.label}>
              Situacao
              <select
                className={styles.select}
                name="vesselStatus"
                onChange={(event) =>
                  setVesselStatus(event.target.value as VesselStatus)
                }
                value={vesselStatus}
              >
                {vesselStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        {collective ? (
          <section className={styles.builderSectionCompact}>
            <div className={styles.builderSectionIntro}>
              <span>Leme</span>
              <h2>Regra padrão da canoa</h2>
              <p>
                Essa regra será usada como padrão operacional. A agenda futura
                poderá sobrescrevê-la por treino.
              </p>
            </div>
            <div className={styles.vesselPolicyGrid}>
              {steererPolicyOptions.map((option) => (
                <label className={styles.vesselPolicyOption} key={option.value}>
                  <input
                    checked={steererPolicy === option.value}
                    name="defaultSteererPolicy"
                    onChange={() => setSteererPolicy(option.value)}
                    type="radio"
                    value={option.value}
                  />
                  <span>
                    <strong>{option.label}</strong>
                    <small>{option.description}</small>
                  </span>
                </label>
              ))}
            </div>
          </section>
        ) : (
          <input name="defaultSteererPolicy" type="hidden" value="" />
        )}

        <section className={styles.builderSectionCompact}>
          <div className={styles.builderSectionIntro}>
            <span>Observações</span>
            <h2>Contexto operacional</h2>
            <p>Campo opcional para manutenção, uso recomendado ou cuidado.</p>
          </div>
          <label className={styles.label}>
            Observacao
            <textarea
              className={styles.textarea}
              defaultValue={resource?.operational_notes ?? ""}
              name="operationalNotes"
              placeholder="Ex.: revisar cabo do iako antes de treinos longos."
              rows={4}
            />
          </label>
        </section>

        <div className={styles.builderStickyActions}>
          <SubmitButton isEditing={Boolean(resource)} />
          <Feedback state={state} />
        </div>
      </div>

      <aside className={styles.builderSummaryPanel}>
        <p className={styles.eyebrow}>Revisao</p>
        <h2>{resource?.name || "Canoa"}</h2>
        <div className={styles.summaryHeroNumber}>{capacity}</div>
        <p>capacidade operacional</p>
        <div className={styles.vesselSummaryList}>
          <div>
            <span>Classe</span>
            <strong>{vesselLabels[vesselClass]}</strong>
          </div>
          <div>
            <span>Situação</span>
            <strong>{statusLabels[vesselStatus]}</strong>
          </div>
          <div>
            <span>Vagas públicas futuras</span>
            <strong>{publicSpots}</strong>
          </div>
          <div>
            <span>Regra de leme</span>
            <strong>
              {effectiveSteererPolicy
                ? steererLabels[effectiveSteererPolicy]
                : "Não se aplica"}
            </strong>
          </div>
        </div>
        <p>
          O resumo é informativo. Nenhum horário será publicado a partir desta
          tela.
        </p>
      </aside>
    </form>
  );
}
