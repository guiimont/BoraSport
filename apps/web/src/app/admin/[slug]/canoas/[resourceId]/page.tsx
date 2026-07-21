import Link from "next/link";
import { notFound } from "next/navigation";

import { getCompanyResourceById } from "../../../../../lib/saas/queries";
import { getManageAdminContext } from "../../admin-context";
import { AdminShell } from "../../admin-shell";
import styles from "../../admin.module.css";
import { CanoaOperationalForm } from "../canoa-operational-form";

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
      subtitle="Revise capacidade, situacao e regra de leme sem alterar historico de reservas."
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
      <CanoaOperationalForm
        companyId={context.company.id}
        resource={resource}
        resourceLabel={context.vocabulary.resource_label}
        slug={context.company.slug}
      />
    </AdminShell>
  );
}
