import Link from "next/link";
import { notFound } from "next/navigation";

import { getCompanyResourceById } from "../../../../../lib/saas/queries";
import { getManageAdminContext } from "../../admin-context";
import { AdminShell } from "../../admin-shell";
import styles from "../../admin.module.css";
import { CanoaOperationalForm } from "../canoa-operational-form";
import { CanoaStatusAction } from "../canoa-status-action";

type EditCanoaPageProps = {
  params: Promise<{
    resourceId: string;
    slug: string;
  }>;
};

export default async function EditCanoaPage({ params }: EditCanoaPageProps) {
  const { resourceId, slug } = await params;
  const context = await getManageAdminContext(slug);
  const resource = await getCompanyResourceById(context.company.id, resourceId);

  if (!resource) {
    notFound();
  }

  return (
    <AdminShell
      active="canoas"
      context={context}
      eyebrow="Canoa"
      showSessionBar={false}
      subtitle="Revise capacidade, situação e regra de leme sem alterar o histórico de reservas."
      title={resource.name}
    >
      <div className={styles.backRow}>
        <Link
          className={styles.secondaryButton}
          href={`/admin/${context.company.slug}/canoas`}
        >
          Voltar para frota
        </Link>
      </div>
      <section className={styles.vesselDetailActions} aria-label="Acoes da canoa">
        <div>
          <p className={styles.eyebrow}>Situação operacional</p>
          <h2>Acoes da frota</h2>
          <p>
            Use estas acoes para preservar historico sem apagar a canoa ou suas
            relações com horários antigos.
          </p>
        </div>
        <div className={styles.vesselActions}>
          <CanoaStatusAction
            companyId={context.company.id}
            resource={resource}
            slug={context.company.slug}
            status="manutencao"
          />
          <CanoaStatusAction
            companyId={context.company.id}
            resource={resource}
            slug={context.company.slug}
            status="disponivel"
          />
          <CanoaStatusAction
            companyId={context.company.id}
            resource={resource}
            slug={context.company.slug}
            status="inativa"
          />
        </div>
      </section>
      <CanoaOperationalForm
        companyId={context.company.id}
        resource={resource}
        resourceLabel={context.vocabulary.resource_label}
        slug={context.company.slug}
      />
    </AdminShell>
  );
}
