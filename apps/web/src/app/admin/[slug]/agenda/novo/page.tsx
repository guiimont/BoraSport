import {
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
    date?: string;
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
  const { date } = (await searchParams) ?? {};
  const context = await getManageAdminContext(slug);
  const [members, resources, trainingPlans] = await Promise.all([
    getCompanyMembers(context.company.id),
    getCompanyResources(context.company.id),
    getCompanyTrainingLibrary(context.company.id),
  ]);

  return (
    <AdminShell
      active="agenda"
      context={context}
      subtitle="Crie uma sessão concreta ou uma recorrência semanal sem sair da Agenda."
      title="Novo horário"
    >
      <OperationalScheduleForm
        companyId={context.company.id}
        initialDate={getDateKey(date)}
        members={members}
        resources={resources}
        slug={context.company.slug}
        trainingPlans={trainingPlans}
      />
    </AdminShell>
  );
}
