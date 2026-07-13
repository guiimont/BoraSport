"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";

import type { Resource, Service, VocabularyConfig } from "../../../types/saas";
import {
  type AdminFormState,
  saveResource,
  saveService,
  saveSlot,
  saveWeeklyWorkout,
} from "./actions";
import styles from "./admin.module.css";

type TenantCatalogFormsProps = {
  companyId: string;
  resources: Resource[];
  services: Service[];
  slug: string;
  vocabulary: Required<VocabularyConfig>;
};

const initialState: AdminFormState = {};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <button className={styles.primaryButton} disabled={pending} type="submit">
      {pending ? "Salvando..." : label}
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

export function TenantCatalogForms({
  companyId,
  resources,
  services,
  slug,
  vocabulary,
}: TenantCatalogFormsProps) {
  const router = useRouter();
  const [resourceState, resourceAction] = useActionState(
    saveResource,
    initialState,
  );
  const [serviceState, serviceAction] = useActionState(
    saveService,
    initialState,
  );
  const [slotState, slotAction] = useActionState(saveSlot, initialState);
  const [weeklyWorkoutState, weeklyWorkoutAction] = useActionState(
    saveWeeklyWorkout,
    initialState,
  );
  const canCreateSlot = resources.length > 0 && services.length > 0;
  const firstServiceDuration = services[0]?.duration_minutes ?? 50;

  useEffect(() => {
    if (
      resourceState.success ||
      serviceState.success ||
      slotState.success ||
      weeklyWorkoutState.success
    ) {
      router.refresh();
    }
  }, [
    resourceState.success,
    router,
    serviceState.success,
    slotState.success,
    weeklyWorkoutState.success,
  ]);

  return (
    <section className={styles.panel}>
      <div className={styles.sectionHead}>
        <div>
          <p className={styles.eyebrow}>Catalogo operacional</p>
          <h2>Cadastros base do agendamento</h2>
          <p className={styles.muted}>
            Defina o que tem capacidade limitada e o que pode ser reservado.
            Esses nomes mudam conforme o vocabulario do tenant.
          </p>
        </div>
      </div>

      <div className={styles.catalogGrid}>
        <form action={resourceAction} className={styles.subForm}>
          <input name="companyId" type="hidden" value={companyId} />
          <input name="slug" type="hidden" value={slug} />
          <input
            name="resourceLabel"
            type="hidden"
            value={vocabulary.resource_label}
          />

          <h3>Novo {vocabulary.resource_label}</h3>

          <label className={styles.label}>
            Nome
            <input
              className={styles.input}
              name="name"
              placeholder={`${vocabulary.resource_label} principal`}
            />
          </label>

          <label className={styles.label}>
            Capacidade
            <input
              className={styles.input}
              defaultValue="1"
              min="1"
              name="capacityMaxima"
              type="number"
            />
          </label>

          <div className={styles.actionRow}>
            <SubmitButton label={`Cadastrar ${vocabulary.resource_label}`} />
            <Feedback state={resourceState} />
          </div>
        </form>

        <form action={serviceAction} className={styles.subForm}>
          <input name="companyId" type="hidden" value={companyId} />
          <input name="slug" type="hidden" value={slug} />
          <input
            name="serviceLabel"
            type="hidden"
            value={vocabulary.service_label}
          />

          <h3>Novo {vocabulary.service_label}</h3>
          <p className={styles.muted}>
            Isso cria o tipo de {vocabulary.service_label.toLowerCase()}. Para
            aparecer para os alunos, publique um horario ou uma grade semanal.
          </p>

          <label className={styles.label}>
            Nome
            <input
              className={styles.input}
              name="name"
              placeholder={`${vocabulary.service_label} padrao`}
            />
          </label>

          <label className={styles.label}>
            Descricao
            <input
              className={styles.input}
              name="description"
              placeholder="Resumo curto para o cliente"
            />
          </label>

          <div className={styles.fieldGridTwo}>
            <label className={styles.label}>
              Duracao em minutos
              <input
                className={styles.input}
                defaultValue="50"
                min="5"
                name="durationMinutes"
                type="number"
              />
            </label>

            <label className={styles.label}>
              Preco
              <input
                className={styles.input}
                defaultValue="0"
                min="0"
                name="price"
                step="0.01"
                type="number"
              />
            </label>
          </div>

          <div className={styles.actionRow}>
            <SubmitButton label={`Cadastrar ${vocabulary.service_label}`} />
            <Feedback state={serviceState} />
          </div>
        </form>
      </div>

      <form action={slotAction} className={styles.subForm}>
        <input name="companyId" type="hidden" value={companyId} />
        <input name="slug" type="hidden" value={slug} />
        <input
          name="resourceLabel"
          type="hidden"
          value={vocabulary.resource_label}
        />
        <input
          name="serviceLabel"
          type="hidden"
          value={vocabulary.service_label}
        />

        <div className={styles.sectionHead}>
          <div>
            <h3>Publicar horario</h3>
            <p className={styles.muted}>
              Crie uma vaga na agenda combinando {vocabulary.service_label} e{" "}
              {vocabulary.resource_label}.
            </p>
          </div>
          {!canCreateSlot ? (
            <p className={styles.empty}>
              Cadastre ao menos um {vocabulary.service_label.toLowerCase()} e um{" "}
              {vocabulary.resource_label.toLowerCase()}.
            </p>
          ) : null}
        </div>

        <div className={styles.fieldGrid}>
          <label className={styles.label}>
            {vocabulary.service_label}
            <select
              className={styles.select}
              disabled={!canCreateSlot}
              name="serviceId"
            >
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.label}>
            {vocabulary.resource_label}
            <select
              className={styles.select}
              disabled={!canCreateSlot}
              name="resourceId"
            >
              {resources.map((resource) => (
                <option key={resource.id} value={resource.id}>
                  {resource.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className={styles.fieldGridFour}>
          <label className={styles.label}>
            Vagas
            <input
              className={styles.input}
              defaultValue="1"
              disabled={!canCreateSlot}
              min="1"
              name="spotsTotal"
              type="number"
            />
          </label>

          <label className={styles.label}>
            Data
            <input
              className={styles.input}
              disabled={!canCreateSlot}
              name="date"
              type="date"
            />
          </label>

          <label className={styles.label}>
            Horario
            <input
              className={styles.input}
              disabled={!canCreateSlot}
              name="time"
              type="time"
            />
          </label>

          <label className={styles.label}>
            Duracao em minutos
            <input
              className={styles.input}
              defaultValue={firstServiceDuration}
              disabled={!canCreateSlot}
              min="5"
              name="durationMinutes"
              type="number"
            />
          </label>
        </div>

        <div className={styles.actionRow}>
          <SubmitButton label="Publicar horario" />
          <Feedback state={slotState} />
        </div>
      </form>

      <form action={weeklyWorkoutAction} className={styles.subForm}>
        <input name="companyId" type="hidden" value={companyId} />
        <input name="slug" type="hidden" value={slug} />

        <div className={styles.sectionHead}>
          <div>
            <h3>Treinos da semana</h3>
            <p className={styles.muted}>
              Publique o conteudo do treino que o aluno vai realizar em cada
              dia. Isso e diferente da agenda de horarios.
            </p>
          </div>
        </div>

        <div className={styles.fieldGridFour}>
          <label className={styles.label}>
            Semana
            <input
              className={styles.input}
              name="workoutWeekStartDate"
              type="date"
            />
          </label>

          <label className={styles.label}>
            Dia
            <select className={styles.select} name="workoutWeekday">
              <option value="1">Segunda</option>
              <option value="2">Terca</option>
              <option value="3">Quarta</option>
              <option value="4">Quinta</option>
              <option value="5">Sexta</option>
              <option value="6">Sabado</option>
              <option value="7">Domingo</option>
            </select>
          </label>

          <label className={styles.label}>
            Nome do treino
            <input
              className={styles.input}
              name="workoutTitle"
              placeholder="Treino de tiro, giro, tecnico..."
            />
          </label>

          <label className={styles.label}>
            Arquivo
            <input
              className={styles.input}
              name="workoutAttachment"
              type="file"
            />
          </label>
        </div>

        <label className={styles.label}>
          Descricao / instrucoes
          <textarea
            className={styles.textarea}
            name="workoutDescription"
            placeholder="Ex: aquecimento 10 min, 8 tiros de 2 min forte por 1 min leve, foco em remada curta..."
            rows={5}
          />
        </label>

        <div className={styles.actionRow}>
          <SubmitButton label="Publicar treino da semana" />
          <Feedback state={weeklyWorkoutState} />
        </div>
      </form>
    </section>
  );
}
