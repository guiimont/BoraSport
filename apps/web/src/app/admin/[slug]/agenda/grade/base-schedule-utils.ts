import type {
  BaseSchedule,
  DefaultSteererPolicy,
  Resource,
  VesselClass,
  VesselStatus,
} from "../../../../../types/saas";

export const weekdayLabels: Record<number, string> = {
  1: "Segunda",
  2: "Terça",
  3: "Quarta",
  4: "Quinta",
  5: "Sexta",
  6: "Sábado",
  7: "Domingo",
};

export const vesselLabels: Record<VesselClass, string> = {
  oc1: "OC1",
  oc4: "OC4",
  oc6: "OC6",
  outro: "Outro",
  v1: "V1",
  v3: "V3",
  v6: "V6",
};

export const vesselStatusLabels: Record<VesselStatus, string> = {
  disponivel: "Disponível",
  inativa: "Inativa",
  manutencao: "Em manutenção",
};

export const steererPolicyLabels: Record<DefaultSteererPolicy, string> = {
  aluno: "Aluno como leme",
  definir_treino: "Definir no treino",
  instrutor: "Instrutor como leme",
};

export function formatScheduleTime(value: string) {
  return value.slice(0, 5);
}

export function getResourceStatus(resource: Resource): VesselStatus {
  return resource.vessel_status ?? (resource.is_active ? "disponivel" : "inativa");
}

export function getPublicSpotsForResource(resource: Resource) {
  if (resource.default_steerer_policy === "instrutor") {
    return Math.max(0, resource.capacity_maxima - 1);
  }

  return resource.capacity_maxima;
}

export function getPublicSpotsForSchedule(schedule: BaseSchedule) {
  return schedule.resources.reduce((total, item) => {
    return total + (item.resource ? getPublicSpotsForResource(item.resource) : 0);
  }, 0);
}

export function getOperationalAlerts(schedule: BaseSchedule) {
  return schedule.resources
    .filter((item) => item.resource && getResourceStatus(item.resource) !== "disponivel")
    .map((item) => `${item.resource?.name} não está disponível`);
}

export function getScheduleEndMinute(schedule: Pick<BaseSchedule, "duration_minutes" | "start_time">) {
  const [hour, minute] = schedule.start_time.split(":").map(Number);

  return hour * 60 + minute + schedule.duration_minutes;
}
