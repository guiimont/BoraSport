import Link from "next/link";

import { getManageAdminContext } from "../../admin-context";
import { getCompanyLocations } from "../../../../../lib/saas/queries";
import { AdminShell } from "../../admin-shell";
import styles from "../../admin.module.css";
import { CanoaOperationalForm } from "../canoa-operational-form";

type NewCanoaPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function NewCanoaPage({ params }: NewCanoaPageProps) {
  const { slug } = await params;
  const context = await getManageAdminContext(slug);
  const locations = await getCompanyLocations(context.company.id);

  return (
    <AdminShell
      active="canoas"
      context={context}
      eyebrow="Nova canoa"
      showSessionBar={false}
      subtitle="Cadastre uma embarcação com capacidade real e regra operacional de leme."
      title="Gestão da frota"
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
        locations={locations}
        resourceLabel={context.vocabulary.resource_label}
        slug={context.company.slug}
      />
    </AdminShell>
  );
}
