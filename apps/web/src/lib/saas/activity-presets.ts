import type { VocabularyConfig } from "../../types/saas";

export type ActivityType =
  | "canoa_havaiana"
  | "crossfit"
  | "esporte"
  | "futvolei"
  | "generico"
  | "pilates"
  | "servicos";

export type ActivityPreset = {
  booking_label: string;
  description: string;
  professional_label: string;
  resource_label: string;
  service_label: string;
  type_de_negocio: ActivityType;
};

export type ActivityExperience = {
  agendaHint: string;
  communityTitle: string;
  conditionTitle: string;
  conditionDescription: string;
  conditionMode: "generic" | "sea" | "training";
  participantLabel: string;
  safetyTitle: string;
  safetyItems: string[];
  tabs: Array<{
    id: "agenda" | "comunidade" | "condicoes" | "divulgacao" | "semana";
    label: string;
  }>;
};

export const activityPresets: ActivityPreset[] = [
  {
    booking_label: "Reserva",
    description: "Clube, base nautica ou escola de remada.",
    professional_label: "Steerer",
    resource_label: "Canoa",
    service_label: "Treino",
    type_de_negocio: "canoa_havaiana",
  },
  {
    booking_label: "Reserva",
    description: "Turmas por horario com coach, cap e lista de espera.",
    professional_label: "Coach",
    resource_label: "Box",
    service_label: "Aula",
    type_de_negocio: "crossfit",
  },
  {
    booking_label: "Agendamento",
    description: "Aulas por sala, aparelho ou professor.",
    professional_label: "Professor",
    resource_label: "Sala",
    service_label: "Aula",
    type_de_negocio: "pilates",
  },
  {
    booking_label: "Reserva",
    description: "Quadras, turmas, aulas e aluguel por horario.",
    professional_label: "Professor",
    resource_label: "Quadra",
    service_label: "Treino",
    type_de_negocio: "futvolei",
  },
  {
    booking_label: "Agendamento",
    description: "Agenda generica para negocios com recursos limitados.",
    professional_label: "Profissional",
    resource_label: "Recurso",
    service_label: "Servico",
    type_de_negocio: "generico",
  },
];

const defaultTabs: ActivityExperience["tabs"] = [
  { id: "agenda", label: "Agenda" },
  { id: "semana", label: "Semana" },
  { id: "comunidade", label: "Equipe" },
  { id: "condicoes", label: "Orientacoes" },
  { id: "divulgacao", label: "Divulgacao" },
];

export function getActivityPreset(type?: string | null) {
  return (
    activityPresets.find((preset) => preset.type_de_negocio === type) ||
    activityPresets[activityPresets.length - 1]
  );
}

export function normalizeVocabulary(
  vocabulary?: VocabularyConfig | null,
): Required<VocabularyConfig> {
  return {
    booking_label: vocabulary?.booking_label || "Reserva",
    professional_label: vocabulary?.professional_label || "Profissional",
    resource_label: vocabulary?.resource_label || "Recurso",
    service_label: vocabulary?.service_label || "Servico",
  };
}

export function getActivityExperience(
  type?: string | null,
  vocabulary?: Required<VocabularyConfig>,
): ActivityExperience {
  const labels =
    vocabulary ||
    normalizeVocabulary(getActivityPreset(type) as Required<VocabularyConfig>);

  if (type === "canoa_havaiana" || type === "esporte") {
    return {
      agendaHint: "Escolha um treino e acompanhe vagas por canoa.",
      communityTitle: "Tripulacao confirmada",
      conditionDescription:
        "Veja vento, ondulacao e referencia visual antes de sair.",
      conditionMode: "sea",
      conditionTitle: "Condicoes do mar",
      participantLabel: "remadores",
      safetyItems: [
        "Confira vento, mare e ondulacao antes de sair.",
        `Use colete e siga a orientacao do ${labels.professional_label}.`,
        "Leve agua, protecao solar e documento.",
        "Avise a base se sentir desconforto durante o treino.",
      ],
      safetyTitle: "Seguranca no mar",
      tabs: [
        { id: "agenda", label: "Agenda" },
        { id: "condicoes", label: "Mar" },
        { id: "semana", label: "Semana" },
        { id: "comunidade", label: "Equipe" },
        { id: "divulgacao", label: "Divulgacao" },
      ],
    };
  }

  if (type === "crossfit") {
    return {
      agendaHint:
        "Escolha uma aula, veja capacidade da turma e quem ja confirmou.",
      communityTitle: "Atletas confirmados",
      conditionDescription:
        "Organize turma, coach, cap e preparacao do treino do dia.",
      conditionMode: "training",
      conditionTitle: "WOD e orientacoes",
      participantLabel: "atletas",
      safetyItems: [
        "Chegue antes do aquecimento.",
        `Avise o ${labels.professional_label} sobre lesoes ou restricoes.`,
        "Respeite escala de carga e tecnica antes de intensidade.",
        "Cancele com antecedencia se nao puder comparecer.",
      ],
      safetyTitle: "Boas praticas do box",
      tabs: defaultTabs,
    };
  }

  if (type === "pilates") {
    return {
      agendaHint: "Reserve a aula conforme sala, professor e disponibilidade.",
      communityTitle: "Alunos agendados",
      conditionDescription:
        "Confira professor, sala, aparelhos e observacoes da aula.",
      conditionMode: "training",
      conditionTitle: "Orientacoes da aula",
      participantLabel: "alunos",
      safetyItems: [
        "Chegue com alguns minutos de antecedencia.",
        "Informe restricoes, dores ou indicacoes medicas.",
        "Use roupas confortaveis para mobilidade.",
        "Cancele com antecedencia para liberar a vaga.",
      ],
      safetyTitle: "Cuidados da sessao",
      tabs: defaultTabs,
    };
  }

  return {
    agendaHint: `Escolha um ${labels.service_label.toLowerCase()} e acompanhe as vagas disponiveis.`,
    communityTitle: "Participantes confirmados",
    conditionDescription: "Confira as orientacoes antes do horario.",
    conditionMode: "generic",
    conditionTitle: "Orientacoes",
    participantLabel: "participantes",
    safetyItems: [
      "Chegue com alguns minutos de antecedencia.",
      "Avise a equipe em caso de atraso ou cancelamento.",
      "Confira os dados do seu agendamento.",
    ],
    safetyTitle: "Antes do horario",
    tabs: defaultTabs,
  };
}
