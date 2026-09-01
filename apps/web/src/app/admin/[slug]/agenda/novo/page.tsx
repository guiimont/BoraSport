import { notFound, redirect } from "next/navigation";

import {
  getCompanyBaseScheduleById,
  getCompanyMembers,
  getCompanyOperationalSessionById,
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
    sessionId?: string;
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
  const { baseScheduleId, date, sessionId, trainingPlanVersionId } =
    (await searchParams) ?? {};
  const context = await getManageAdminContext(slug);

  if (context.role !== "admin") {
    redirect(`/admin/${context.company.slug}/agenda`);
  }

  const [baseSchedule, session, members, resources, trainingPlans] = await Promise.all([
    baseScheduleId
      ? getCompanyBaseScheduleById(context.company.id, baseScheduleId)
      : Promise.resolve(null),
    sessionId
      ? getCompanyOperationalSessionById({
          companyId: context.company.id,
          sessionId,
        })
      : Promise.resolve(null),
    getCompanyMembers(context.company.id),
    getCompanyResources(context.company.id),
    getCompanyTrainingLibrary(context.company.id),
  ]);

  if (sessionId && !session) {
    notFound();
  }

  return (
    <AdminShell
      active="agenda"
      context={context}
      subtitle={
        session
          ? "Ajuste esta sessão sem alterar a grade semanal."
          : baseSchedule
          ? "Defina o treino e ajuste esta ocorrência sem alterar as demais datas."
          : "Crie uma sessão ou um horário semanal recorrente sem sair da Agenda."
      }
      title={session ? "Editar sessão" : baseSchedule ? "Planejar sessão" : "Novo horário"}
    >
      <OperationalScheduleForm
        companyId={context.company.id}
        initialSchedule={session ? null : baseSchedule}
        initialSession={session}
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
