"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";

import { FileField } from "../../../components/ui";
import type { Resource, Service, VocabularyConfig } from "../../../types/saas";
import {
  type AdminFormState,
  saveResource,
  saveService,
  saveSlot,
  saveWeeklySlots,
  saveWeeklyWorkout,
} from "./actions";
import styles from "./admin.module.css";

type CatalogFormProps = {
  companyId: string;
  slug: string;
  vocabulary: Required<VocabularyConfig>;
};

type SlotFormProps = CatalogFormProps & {
  resources: Resource[];
  services: Service[];
};

type TenantCatalogFormsProps = SlotFormProps;

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

function useRefreshOnSuccess(state: AdminFormState) {
  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [router, state.success]);
}

export function ResourceForm({ companyId, slug, vocabulary }: CatalogFormProps) {
  const [state, action] = useActionState(saveResource, initialState);
  useRefreshOnSuccess(state);

  return (
    <form action={action} className={styles.subForm}>
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
        <Feedback state={state} />
      </div>
    </form>
  );
}

export function ServiceForm({ companyId, slug, vocabulary }: CatalogFormProps) {
  const [state, action] = useActionState(saveService, initialState);
  useRefreshOnSuccess(state);

  return (
    <form action={action} className={styles.subForm}>
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
        aparecer para os alunos, publique um horário na agenda.
      </p>

      <label className={styles.label}>
        Nome
        <input
          className={styles.input}
          name="name"
          placeholder={`${vocabulary.service_label} padrão`}
        />
      </label>

      <label className={styles.label}>
        Descrição
        <input
          className={styles.input}
          name="description"
          placeholder="Resumo curto para o remador"
        />
      </label>

      <div className={styles.fieldGridTwo}>
        <label className={styles.label}>
          Duração em minutos
          <input
            className={styles.input}
            defaultValue="50"
            min="5"
            name="durationMinutes"
            type="number"
          />
        </label>

        <label className={styles.label}>
          Preço
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
        <Feedback state={state} />
      </div>
    </form>
  );
}

export function SlotForm({
  companyId,
  resources,
  services,
  slug,
  vocabulary,
}: SlotFormProps) {
  const [state, action] = useActionState(saveSlot, initialState);
  useRefreshOnSuccess(state);
  const canCreateSlot = resources.length > 0 && services.length > 0;
  const firstServiceDuration = services[0]?.duration_minutes ?? 50;

  return (
    <form action={action} className={styles.subForm} id="publicar-horario">
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
          <h3>Publicar horário</h3>
          <p className={styles.muted}>
            Combine {vocabulary.service_label.toLowerCase()} e{" "}
            {vocabulary.resource_label.toLowerCase()} para abrir vagas.
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
          Horário
          <input
            className={styles.input}
            disabled={!canCreateSlot}
            name="time"
            type="time"
          />
        </label>

        <label className={styles.label}>
          Duração em minutos
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
        <SubmitButton label="Publicar horário" />
        <Feedback state={state} />
      </div>
    </form>
  );
}

export function WeeklySlotsForm({
  companyId,
  resources,
  services,
  slug,
  vocabulary,
}: SlotFormProps) {
  const [state, action] = useActionState(saveWeeklySlots, initialState);
  useRefreshOnSuccess(state);
  const canCreateSlot = resources.length > 0 && services.length > 0;
  const firstServiceDuration = services[0]?.duration_minutes ?? 60;
  const weekdays = [
    ["1", "Seg"],
    ["2", "Ter"],
    ["3", "Qua"],
    ["4", "Qui"],
    ["5", "Sex"],
  ];

  return (
    <form action={action} className={styles.subForm}>
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
          <h3>Publicar grade semanal</h3>
          <p className={styles.muted}>
            Abra horários recorrentes para a semana sem repetir cadastro por
            cadastro.
          </p>
        </div>
      </div>

      <div className={styles.fieldGrid}>
        <label className={styles.label}>
          {vocabulary.service_label}
          <select
            className={styles.select}
            disabled={!canCreateSlot}
            name="weeklyServiceId"
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
            name="weeklyResourceId"
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
          De
          <input
            className={styles.input}
            disabled={!canCreateSlot}
            name="dateStart"
            type="date"
          />
        </label>

        <label className={styles.label}>
          Até
          <input
            className={styles.input}
            disabled={!canCreateSlot}
            name="dateEnd"
            type="date"
          />
        </label>

        <label className={styles.label}>
          Primeiro horário
          <input
            className={styles.input}
            disabled={!canCreateSlot}
            name="timeOne"
            type="time"
          />
        </label>

        <label className={styles.label}>
          Segundo horário
          <input
            className={styles.input}
            disabled={!canCreateSlot}
            name="timeTwo"
            type="time"
          />
        </label>
      </div>

      <div className={styles.fieldGridTwo}>
        <label className={styles.label}>
          Vagas por horário
          <input
            className={styles.input}
            defaultValue="6"
            disabled={!canCreateSlot}
            min="1"
            name="weeklySpotsTotal"
            type="number"
          />
        </label>

        <label className={styles.label}>
          Duração em minutos
          <input
            className={styles.input}
            defaultValue={firstServiceDuration}
            disabled={!canCreateSlot}
            min="5"
            name="weeklyDurationMinutes"
            type="number"
          />
        </label>
      </div>

      <fieldset className={styles.checkPanel}>
        <legend>Dias da semana</legend>
        <div className={styles.checkGrid}>
          {weekdays.map(([value, label]) => (
            <label className={styles.checkItem} key={value}>
              <input
                defaultChecked
                disabled={!canCreateSlot}
                name="weekdays"
                type="checkbox"
                value={value}
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className={styles.actionRow}>
        <SubmitButton label="Publicar grade" />
        <Feedback state={state} />
      </div>
    </form>
  );
}

export function WeeklyWorkoutForm({ companyId, slug }: CatalogFormProps) {
  const [state, action] = useActionState(saveWeeklyWorkout, initialState);
  useRefreshOnSuccess(state);

  return (
    <form action={action} className={styles.subForm}>
      <input name="companyId" type="hidden" value={companyId} />
      <input name="slug" type="hidden" value={slug} />

      <div className={styles.sectionHead}>
        <div>
          <h3>Treinos da semana</h3>
          <p className={styles.muted}>
            Publique o conteúdo técnico que o remador vai realizar em cada dia.
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
            <option value="2">Terça</option>
            <option value="3">Quarta</option>
            <option value="4">Quinta</option>
            <option value="5">Sexta</option>
            <option value="6">Sábado</option>
            <option value="7">Domingo</option>
          </select>
        </label>

        <label className={styles.label}>
          Nome do treino
          <input
            className={styles.input}
            name="workoutTitle"
            placeholder="Treino de tiro, giro, técnico..."
          />
        </label>

        <FileField
          actionLabel="Selecionar arquivo"
          label="Arquivo"
          name="workoutAttachment"
        />
      </div>

      <label className={styles.label}>
        Descrição / instruções
        <textarea
          className={styles.textarea}
          name="workoutDescription"
          placeholder="Ex: aquecimento 10 min, 8 tiros de 2 min forte por 1 min leve..."
          rows={5}
        />
      </label>

      <div className={styles.actionRow}>
        <SubmitButton label="Publicar treino da semana" />
        <Feedback state={state} />
      </div>
    </form>
  );
}

export function TenantCatalogForms({
  companyId,
  resources,
  services,
  slug,
  vocabulary,
}: TenantCatalogFormsProps) {
  return (
    <section className={styles.panel}>
      <div className={styles.sectionHead}>
        <div>
          <p className={styles.eyebrow}>Catálogo operacional</p>
          <h2>Cadastros base do agendamento</h2>
          <p className={styles.muted}>
            Defina o que tem capacidade limitada e o que pode ser reservado.
          </p>
        </div>
      </div>

      <div className={styles.catalogGrid}>
        <ResourceForm
          companyId={companyId}
          slug={slug}
          vocabulary={vocabulary}
        />
        <ServiceForm companyId={companyId} slug={slug} vocabulary={vocabulary} />
      </div>

      <SlotForm
        companyId={companyId}
        resources={resources}
        services={services}
        slug={slug}
        vocabulary={vocabulary}
      />

      <WeeklyWorkoutForm
        companyId={companyId}
        slug={slug}
        vocabulary={vocabulary}
      />
    </section>
  );
}
