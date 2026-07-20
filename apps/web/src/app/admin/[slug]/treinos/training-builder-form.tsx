"use client";

import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";

import type {
  BoraZone,
  TrainingBlockType,
  TrainingVersionLevel,
  VesselClass,
} from "../../../../types/saas";
import {
  createStructuredTrainingPlan,
  type TrainingBuilderState,
} from "./actions";
import styles from "../admin.module.css";

type BuilderBlock = {
  block_kind: "simple" | "repeat_group";
  block_type: TrainingBlockType | "";
  bora_zone: BoraZone | "";
  client_key: string;
  duration_minutes: number;
  instruction: string;
  name: string;
  parent_client_key: string | null;
  repeat_count: number;
  sort_order: number;
};

type TrainingBuilderFormProps = {
  slug: string;
};

const initialState: TrainingBuilderState = {};

const vesselOptions: Array<{ label: string; value: VesselClass }> = [
  { label: "V1", value: "v1" },
  { label: "OC1", value: "oc1" },
  { label: "V3", value: "v3" },
  { label: "OC4", value: "oc4" },
  { label: "V6", value: "v6" },
  { label: "OC6", value: "oc6" },
  { label: "Outro", value: "outro" },
];

const levelOptions: Array<{ label: string; value: TrainingVersionLevel }> = [
  { label: "Iniciante", value: "iniciante" },
  { label: "Intermediário", value: "intermediario" },
  { label: "Avançado", value: "avancado" },
  { label: "Competição", value: "competicao" },
  { label: "Personalizado", value: "personalizado" },
];

const blockTypeOptions: Array<{ label: string; value: TrainingBlockType }> = [
  { label: "Aquecimento", value: "aquecimento" },
  { label: "Técnica", value: "tecnica" },
  { label: "Base", value: "base" },
  { label: "Ritmo", value: "ritmo" },
  { label: "Forte", value: "forte" },
  { label: "Largada", value: "largada" },
  { label: "Recuperação", value: "recuperacao" },
  { label: "Descanso e hidratação", value: "descanso_hidratacao" },
  { label: "Volta à calma", value: "volta_calma" },
];

const zoneOptions: Array<{ label: string; value: BoraZone }> = [
  { label: "Z1 Recuperar", value: "z1_recuperar" },
  { label: "Z2 Base", value: "z2_base" },
  { label: "Z3 Ritmo", value: "z3_ritmo" },
  { label: "Z4 Forte", value: "z4_forte" },
  { label: "Z5 Máximo", value: "z5_maximo" },
];

function createBlock(parentClientKey: string | null = null): BuilderBlock {
  const key = `block-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  return {
    block_kind: "simple",
    block_type: "base",
    bora_zone: "z2_base",
    client_key: key,
    duration_minutes: 10,
    instruction: "",
    name: parentClientKey ? "Bloco da repetição" : "Bloco",
    parent_client_key: parentClientKey,
    repeat_count: 2,
    sort_order: 1,
  };
}

function createGroup(): BuilderBlock {
  const key = `group-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  return {
    block_kind: "repeat_group",
    block_type: "",
    bora_zone: "",
    client_key: key,
    duration_minutes: 0,
    instruction: "",
    name: "Repetição",
    parent_client_key: null,
    repeat_count: 3,
    sort_order: 1,
  };
}

function SubmitButton({
  children,
  value,
}: {
  children: string;
  value: "draft" | "publish";
}) {
  const { pending } = useFormStatus();

  return (
    <button
      className={value === "publish" ? styles.primaryButton : styles.secondaryButton}
      disabled={pending}
      name="intent"
      type="submit"
      value={value}
    >
      {pending ? "Salvando..." : children}
    </button>
  );
}

export function TrainingBuilderForm({ slug }: TrainingBuilderFormProps) {
  const [state, action] = useActionState(createStructuredTrainingPlan, initialState);
  const [blocks, setBlocks] = useState<BuilderBlock[]>([createBlock()]);

  const normalizedBlocks = useMemo(
    () =>
      blocks.map((block, index) => ({
        ...block,
        sort_order: index + 1,
      })),
    [blocks],
  );
  const totalMinutes = normalizedBlocks.reduce((total, block) => {
    if (block.block_kind === "repeat_group") {
      const childrenTotal = normalizedBlocks
        .filter((child) => child.parent_client_key === block.client_key)
        .reduce((childTotal, child) => childTotal + child.duration_minutes, 0);

      return total + childrenTotal * block.repeat_count;
    }

    if (block.parent_client_key) {
      return total;
    }

    return total + block.duration_minutes;
  }, 0);
  const zoneTotals = zoneOptions.map((zone) => ({
    ...zone,
    minutes: normalizedBlocks
      .filter(
        (block) =>
          block.block_kind === "simple" && block.bora_zone === zone.value,
      )
      .reduce((total, block) => total + block.duration_minutes, 0),
  }));

  function updateBlock(clientKey: string, patch: Partial<BuilderBlock>) {
    setBlocks((currentBlocks) =>
      currentBlocks.map((block) =>
        block.client_key === clientKey ? { ...block, ...patch } : block,
      ),
    );
  }

  function removeBlock(clientKey: string) {
    setBlocks((currentBlocks) =>
      currentBlocks.filter(
        (block) =>
          block.client_key !== clientKey &&
          block.parent_client_key !== clientKey,
      ),
    );
  }

  function moveBlock(clientKey: string, direction: -1 | 1) {
    setBlocks((currentBlocks) => {
      const index = currentBlocks.findIndex((block) => block.client_key === clientKey);

      if (index < 0) {
        return currentBlocks;
      }

      const nextIndex = index + direction;

      if (nextIndex < 0 || nextIndex >= currentBlocks.length) {
        return currentBlocks;
      }

      const nextBlocks = [...currentBlocks];
      const [block] = nextBlocks.splice(index, 1);
      nextBlocks.splice(nextIndex, 0, block);

      return nextBlocks;
    });
  }

  function addGroup() {
    const group = createGroup();
    const child = createBlock(group.client_key);

    setBlocks((currentBlocks) => [...currentBlocks, group, child]);
  }

  return (
    <form action={action} className={styles.trainingBuilder}>
      <input name="slug" type="hidden" value={slug} />
      <input
        name="blocksJson"
        type="hidden"
        value={JSON.stringify(normalizedBlocks)}
      />

      <section className={styles.builderSection}>
        <div className={styles.builderSectionIntro}>
          <span>Etapa 1</span>
          <h2>Informações</h2>
          <p>Defina a identidade esportiva do treino.</p>
        </div>
        <div className={styles.builderGrid}>
          <label className={styles.label}>
            Nome
            <input
              className={styles.input}
              name="title"
              placeholder="Treino de base progressiva"
              required
            />
          </label>
          <label className={styles.label}>
            Classe de embarcação
            <select className={styles.select} name="vesselClass">
              {vesselOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.label}>
            Objetivo
            <textarea
              className={styles.textarea}
              name="objective"
              placeholder="Ex: sustentar Z2 com técnica limpa e transições controladas."
              rows={4}
            />
          </label>
        </div>
      </section>

      <section className={styles.builderSection}>
        <div className={styles.builderSectionIntro}>
          <span>Etapa 2</span>
          <h2>Versão</h2>
          <p>Crie a primeira versão do treino. Ela permanece editável enquanto estiver em rascunho.</p>
        </div>
        <div className={styles.builderGridThree}>
          <label className={styles.label}>
            Nível
            <select className={styles.select} name="level">
              {levelOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.label}>
            Duração prevista
            <span className={styles.numberFieldShell}>
              <input
                className={styles.numberInput}
                defaultValue="50"
                min="1"
                name="durationMinutes"
                type="number"
              />
              <span className={styles.numberFieldUnit}>min</span>
            </span>
          </label>
          <label className={styles.label}>
            Observações técnicas
            <input
              className={styles.input}
              name="technicalNotes"
              placeholder="Foco técnico principal"
            />
          </label>
          <label className={styles.label}>
            Observações de segurança
            <input
              className={styles.input}
              name="safetyNotes"
              placeholder="Condições, atenção ou restrições"
            />
          </label>
        </div>
      </section>

      <section className={styles.builderSection}>
        <div className={styles.builderSectionIntro}>
          <span>Etapa 3</span>
          <h2>Estrutura</h2>
          <p>Organize blocos por tempo e Zona Bora. Grupos podem conter apenas blocos simples.</p>
        </div>
        <div className={styles.trainingTimeline}>
          {normalizedBlocks
            .filter((block) => !block.parent_client_key)
            .map((block) => {
              const children = normalizedBlocks.filter(
                (child) => child.parent_client_key === block.client_key,
              );

              return (
                <article className={styles.timelineBlock} key={block.client_key}>
                  <div className={styles.timelineBlockHeader}>
                    <strong>
                      {block.block_kind === "repeat_group"
                        ? "Repetição"
                        : "Bloco simples"}
                    </strong>
                    <div>
                      <button
                        aria-label="Mover para cima"
                        onClick={() => moveBlock(block.client_key, -1)}
                        type="button"
                      >
                        ↑
                      </button>
                      <button
                        aria-label="Mover para baixo"
                        onClick={() => moveBlock(block.client_key, 1)}
                        type="button"
                      >
                        ↓
                      </button>
                      <button
                        onClick={() => removeBlock(block.client_key)}
                        type="button"
                      >
                        Remover
                      </button>
                    </div>
                  </div>

                  {block.block_kind === "repeat_group" ? (
                    <div className={styles.repeatGroup}>
                      <label className={styles.label}>
                        Nome do grupo
                        <input
                          className={styles.input}
                          onChange={(event) =>
                            updateBlock(block.client_key, {
                              name: event.currentTarget.value,
                            })
                          }
                          value={block.name}
                        />
                      </label>
                      <label className={styles.label}>
                        Repetir
                        <span className={styles.numberFieldShell}>
                          <input
                            className={styles.numberInput}
                            min="2"
                            onChange={(event) =>
                              updateBlock(block.client_key, {
                                repeat_count: Number(event.currentTarget.value),
                              })
                            }
                            type="number"
                            value={block.repeat_count}
                          />
                          <span className={styles.numberFieldUnit}>x</span>
                        </span>
                      </label>
                      <div className={styles.repeatChildren}>
                        {children.map((child) => (
                          <BlockEditor
                            block={child}
                            key={child.client_key}
                            onRemove={removeBlock}
                            onUpdate={updateBlock}
                          />
                        ))}
                        <button
                          className={styles.secondaryButton}
                          onClick={() =>
                            setBlocks((currentBlocks) => [
                              ...currentBlocks,
                              createBlock(block.client_key),
                            ])
                          }
                          type="button"
                        >
                          Adicionar bloco à repetição
                        </button>
                      </div>
                    </div>
                  ) : (
                    <BlockEditor
                      block={block}
                      onRemove={removeBlock}
                      onUpdate={updateBlock}
                    />
                  )}
                </article>
              );
            })}
        </div>
        <div className={styles.builderActionsInline}>
          <button
            className={styles.secondaryButton}
            onClick={() => setBlocks((currentBlocks) => [...currentBlocks, createBlock()])}
            type="button"
          >
            Adicionar bloco
          </button>
          <button className={styles.secondaryButton} onClick={addGroup} type="button">
            Adicionar repetição
          </button>
        </div>
      </section>

      <section className={styles.builderSection}>
        <div className={styles.builderSectionIntro}>
          <span>Etapa 4</span>
          <h2>Revisão</h2>
          <p>Confira a duração calculada e a distribuição por zona antes de salvar.</p>
        </div>
        <div className={styles.trainingReview}>
          <div>
            <span>Duração calculada</span>
            <strong>{totalMinutes} min</strong>
          </div>
          {zoneTotals.map((zone) => (
            <div key={zone.value}>
              <span>{zone.label}</span>
              <strong>{zone.minutes} min</strong>
            </div>
          ))}
        </div>
        {state.error ? (
          <p className={styles.error} role="alert">
            {state.error}
          </p>
        ) : null}
        <div className={styles.builderSubmitRow}>
          <SubmitButton value="draft">Salvar rascunho</SubmitButton>
          <SubmitButton value="publish">Publicar versão</SubmitButton>
        </div>
      </section>
    </form>
  );
}

function BlockEditor({
  block,
  onRemove,
  onUpdate,
}: {
  block: BuilderBlock;
  onRemove: (clientKey: string) => void;
  onUpdate: (clientKey: string, patch: Partial<BuilderBlock>) => void;
}) {
  return (
    <div className={styles.blockEditor}>
      <div className={styles.builderGridThree}>
        <label className={styles.label}>
          Tipo
          <select
            className={styles.select}
            onChange={(event) =>
              onUpdate(block.client_key, {
                block_type: event.currentTarget.value as TrainingBlockType,
              })
            }
            value={block.block_type}
          >
            {blockTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.label}>
          Nome
          <input
            className={styles.input}
            onChange={(event) =>
              onUpdate(block.client_key, {
                name: event.currentTarget.value,
              })
            }
            value={block.name}
          />
        </label>
        <label className={styles.label}>
          Duração
          <span className={styles.numberFieldShell}>
            <input
              className={styles.numberInput}
              min="1"
              onChange={(event) =>
                onUpdate(block.client_key, {
                  duration_minutes: Number(event.currentTarget.value),
                })
              }
              type="number"
              value={block.duration_minutes}
            />
            <span className={styles.numberFieldUnit}>min</span>
          </span>
        </label>
        <label className={styles.label}>
          Zona Bora
          <select
            className={styles.select}
            onChange={(event) =>
              onUpdate(block.client_key, {
                bora_zone: event.currentTarget.value as BoraZone,
              })
            }
            value={block.bora_zone}
          >
            {zoneOptions.map((zone) => (
              <option key={zone.value} value={zone.value}>
                {zone.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className={styles.label}>
        Instrução
        <textarea
          className={styles.textarea}
          onChange={(event) =>
            onUpdate(block.client_key, {
              instruction: event.currentTarget.value,
            })
          }
          placeholder="Oriente execução, técnica e recuperação."
          rows={3}
          value={block.instruction}
        />
      </label>
      {block.parent_client_key ? (
        <button
          className={styles.secondaryButton}
          onClick={() => onRemove(block.client_key)}
          type="button"
        >
          Remover bloco da repetição
        </button>
      ) : null}
    </div>
  );
}
