"use client";

import {
  useActionState,
  useEffect,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
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

type ServiceFormProps = CatalogFormProps & {
  variant?: "catalog" | "trainingQuick";
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

function FormSection({
  children,
  description,
  title,
}: {
  children: ReactNode;
  description?: string;
  title: string;
}) {
  return (
    <section className={styles.formSection}>
      <div>
        <h3>{title}</h3>
        {description ? <p className={styles.muted}>{description}</p> : null}
      </div>
      <div className={styles.formSectionFields}>{children}</div>
    </section>
  );
}

type AdminInputProps = InputHTMLAttributes<HTMLInputElement> & {
  help?: string;
  label: string;
};

function TextField({ help, label, ...inputProps }: AdminInputProps) {
  return (
    <label className={styles.label}>
      {label}
      <input className={styles.input} {...inputProps} />
      {help ? <span className={styles.fieldHelp}>{help}</span> : null}
    </label>
  );
}

function DateField({ help, label, ...inputProps }: AdminInputProps) {
  return (
    <label className={styles.label}>
      {label}
      <span className={styles.dateFieldShell}>
        <input className={styles.dateInput} type="date" {...inputProps} />
        <span aria-hidden="true" className={styles.dateFieldIcon}>
          <svg viewBox="0 0 24 24" focusable="false">
            <path d="M7 3v3M17 3v3M4 9h16M6 5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
          </svg>
        </span>
      </span>
      {help ? <span className={styles.fieldHelp}>{help}</span> : null}
    </label>
  );
}

function NumberField({ help, label, ...inputProps }: AdminInputProps) {
  return (
    <label className={styles.label}>
      {label}
      <span className={styles.numberFieldShell}>
        <input className={styles.numberInput} type="number" {...inputProps} />
        <span className={styles.numberFieldUnit}>min</span>
      </span>
      {help ? <span className={styles.fieldHelp}>{help}</span> : null}
    </label>
  );
}

function SelectField({
  children,
  help,
  label,
  ...selectProps
}: SelectHTMLAttributes<HTMLSelectElement> & {
  help?: string;
  label: string;
}) {
  return (
    <label className={styles.label}>
      {label}
      <select className={styles.select} {...selectProps}>
        {children}
      </select>
      {help ? <span className={styles.fieldHelp}>{help}</span> : null}
    </label>
  );
}

function getWeekdayFromDate(date: string) {
  if (!date) {
    return null;
  }

  const parsedDate = new Date(`${date}T00:00:00`);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  const day = parsedDate.getDay();

  return day === 0 ? "7" : String(day);
}

function getWeekdayLabel(value: string | null) {
  const labels: Record<string, string> = {
    "1": "Segunda-feira",
    "2": "Terça-feira",
    "3": "Quarta-feira",
    "4": "Quinta-feira",
    "5": "Sexta-feira",
    "6": "Sábado",
    "7": "Domingo",
  };

  return value ? labels[value] : "Escolha uma data";
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

export function ServiceForm({
  companyId,
  slug,
  variant = "catalog",
  vocabulary,
}: ServiceFormProps) {
  const [state, action] = useActionState(saveService, initialState);
  useRefreshOnSuccess(state);
  const isTrainingQuick = variant === "trainingQuick";

  return (
    <form
      action={action}
      className={`${styles.subForm} ${
        isTrainingQuick ? styles.trainingQuickForm : ""
      }`}
    >
      <input name="companyId" type="hidden" value={companyId} />
      <input name="slug" type="hidden" value={slug} />
      <input
        name="serviceLabel"
        type="hidden"
        value={vocabulary.service_label}
      />

      {isTrainingQuick ? null : <h3>Novo {vocabulary.service_label}</h3>}

      <FormSection
        description={
          isTrainingQuick
            ? "Use este cadastro para opções simples da agenda. O construtor estruturado virá depois."
            : `Isso cria o tipo de ${vocabulary.service_label.toLowerCase()} usado na agenda.`
        }
        title={isTrainingQuick ? "Dados esportivos" : "Dados principais"}
      >
        <TextField
          label="Nome"
          name="name"
          placeholder={`${vocabulary.service_label} padrão`}
        />

        <TextField
          label="Descrição"
          name="description"
          placeholder="Resumo curto para o remador"
        />

        <NumberField
          defaultValue="50"
          help="Duração prevista em minutos."
          label="Duração"
          min="5"
          name="durationMinutes"
        />
      </FormSection>

      <FormSection
        description="Mantido por compatibilidade com o catálogo atual. Use 0 quando não houver cobrança associada."
        title="Configuração comercial"
      >
        <label className={styles.label}>
          Preço
          <span className={styles.priceFieldShell}>
            <span>R$</span>
            <input
              className={styles.priceInput}
              defaultValue="0"
              min="0"
              name="price"
              step="0.01"
              type="number"
            />
          </span>
        </label>
      </FormSection>

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
  const [selectedDate, setSelectedDate] = useState("");
  const weekdayValue = getWeekdayFromDate(selectedDate);

  return (
    <form action={action} className={`${styles.subForm} ${styles.weeklyWorkoutForm}`}>
      <input name="companyId" type="hidden" value={companyId} />
      <input name="slug" type="hidden" value={slug} />

      <FormSection
        description="Publique o conteúdo técnico que o remador vai realizar no dia."
        title="Programação"
      >
        <div className={styles.weekPlanGrid}>
          <DateField
            label="Data"
            name="workoutWeekStartDate"
            onChange={(event) => setSelectedDate(event.currentTarget.value)}
          />

          <div className={styles.label}>
            Dia da semana
            {weekdayValue ? (
              <>
                <input name="workoutWeekday" type="hidden" value={weekdayValue} />
                <div className={styles.derivedField}>
                  {getWeekdayLabel(weekdayValue)}
                </div>
              </>
            ) : (
              <SelectField label="Escolha manualmente" name="workoutWeekday">
                <option value="1">Segunda</option>
                <option value="2">Terça</option>
                <option value="3">Quarta</option>
                <option value="4">Quinta</option>
                <option value="5">Sexta</option>
                <option value="6">Sábado</option>
                <option value="7">Domingo</option>
              </SelectField>
            )}
          </div>

          <TextField
            label="Treino"
            name="workoutTitle"
            placeholder="Treino de tiro, giro, técnico..."
          />

          <FileField
            actionLabel="Selecionar arquivo"
            className={styles.weeklyFileField}
            label="Anexo opcional"
            name="workoutAttachment"
          />
        </div>
      </FormSection>

      <FormSection title="Instruções">
        <label className={styles.label}>
          Orientação para os remadores
          <textarea
            className={styles.textarea}
            name="workoutDescription"
            placeholder="Ex: aquecimento 10 min, 8 tiros de 2 min forte por 1 min leve..."
            rows={5}
          />
        </label>
      </FormSection>

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
