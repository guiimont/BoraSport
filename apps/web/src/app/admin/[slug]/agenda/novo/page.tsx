import {
  getCompanyBaseScheduleById,
  getCompanyMembers,
  getCompanyResources,
  getCompanyTrainingLibrary,
} from "../../../../../lib/saas/queries";
import { getManageAdminContext } from "../../admin-context";
import { AdminShell } from "../../admin-shell";
import { OperationalScheduleForm } from "../operational-schedule-form";

type NewAgendaSchedulePageProps = {
  params: Promise<{
    slug: string;
  }>;
  searchParams?: Promise<{
    baseScheduleId?: string;
    date?: string;
    trainingPlanVersionId?: string;
  }>;
};

function getDateKey(value?: string | null) {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  return new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
    year: "numeric",
  }).format(new Date());
}

export default async function NewAgendaSchedulePage({
  params,
  searchParams,
}: NewAgendaSchedulePageProps) {
  const { slug } = await params;
  const { baseScheduleId, date, trainingPlanVersionId } =
    (await searchParams) ?? {};
  const context = await getManageAdminContext(slug);
  const [baseSchedule, members, resources, trainingPlans] = await Promise.all([
    baseScheduleId
      ? getCompanyBaseScheduleById(context.company.id, baseScheduleId)
      : Promise.resolve(null),
    getCompanyMembers(context.company.id),
    getCompanyResources(context.company.id),
    getCompanyTrainingLibrary(context.company.id),
  ]);

  return (
    <AdminShell
      active="agenda"
      context={context}
      subtitle={
        baseSchedule
          ? "Defina o treino e ajuste esta ocorrência sem alterar as demais datas."
          : "Crie uma sessão ou um horário semanal recorrente sem sair da Agenda."
      }
      title={baseSchedule ? "Planejar sessão" : "Novo horário"}
    >
      <OperationalScheduleForm
        companyId={context.company.id}
        initialSchedule={baseSchedule}
        initialDate={getDateKey(date)}
        initialTrainingPlanVersionId={trainingPlanVersionId}
        members={members}
        resources={resources}
        slug={context.company.slug}
        trainingPlans={trainingPlans}
      />
    </AdminShell>
  );
}
