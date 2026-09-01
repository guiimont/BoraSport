import Link from "next/link";

import {
  getCompanyBaseScheduleById,
  getCompanyBaseSchedules,
  getCompanyMembers,
  getCompanyLocations,
  getCompanyResources,
} from "../../../../../../lib/saas/queries";
import { getManageAdminContext } from "../../../admin-context";
import { AdminShell } from "../../../admin-shell";
import styles from "../../../admin.module.css";
import { BaseScheduleForm } from "../base-schedule-form";

type NewBaseSchedulePageProps = {
  params: Promise<{
    slug: string;
  }>;
  searchParams?: Promise<{
    duplicar?: string;
  }>;
};

export default async function NewBaseSchedulePage({
  params,
  searchParams,
}: NewBaseSchedulePageProps) {
  const { slug } = await params;
  const duplicateId = (await searchParams)?.duplicar ?? null;
  const context = await getManageAdminContext(slug);
  const [resources, members, locations, existingSchedules, duplicateSchedule] = await Promise.all([
    getCompanyResources(context.company.id),
    getCompanyMembers(context.company.id),
    getCompanyLocations(context.company.id),
    getCompanyBaseSchedules(context.company.id),
    duplicateId
      ? getCompanyBaseScheduleById(context.company.id, duplicateId)
      : Promise.resolve(null),
  ]);

  return (
    <AdminShell
      active="agenda"
      context={context}
      eyebrow="Novo horário"
      showSessionBar={false}
      subtitle="Cadastre um horário recorrente da operação semanal sem publicar vagas ainda."
      title="Grade-base"
    >
      <div className={styles.backRow}>
        <Link
          className={styles.secondaryButton}
          href={`/admin/${context.company.slug}/agenda/grade`}
        >
          Voltar para grade
        </Link>
      </div>
      <BaseScheduleForm
        companyId={context.company.id}
        existingSchedules={existingSchedules}
        members={members}
        locations={locations}
        resources={resources}
        schedule={duplicateSchedule ? { ...duplicateSchedule, id: "" } : null}
        slug={context.company.slug}
      />
    </AdminShell>
  );
}
