import { getCompanyResources } from "../../../../lib/saas/queries";
import { getManageAdminContext } from "../admin-context";
import { AdminShell } from "../admin-shell";
import styles from "../admin.module.css";
import { ResourceForm } from "../tenant-catalog-forms";

type AdminResourcesPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function AdminResourcesPage({
  params,
}: AdminResourcesPageProps) {
  const { slug } = await params;
  const context = await getManageAdminContext(slug);
  const { company, vocabulary } = context;
  const resources = await getCompanyResources(company.id);

  return (
    <AdminShell
      active="canoas"
      context={context}
      subtitle="Cadastre canoas e equipamentos com a capacidade que controla a lotação."
      title={vocabulary.resource_label}
    >
      <section className={styles.panel} id="cadastrar-canoa">
        <div className={styles.sectionHead}>
          <div>
            <p className={styles.eyebrow}>Cadastro</p>
            <h2>Novo {vocabulary.resource_label.toLowerCase()}</h2>
          </div>
        </div>
        <ResourceForm
          companyId={company.id}
          slug={company.slug}
          vocabulary={vocabulary}
        />
      </section>

      <section className={styles.panel}>
        <div className={styles.sectionHead}>
          <div>
            <p className={styles.eyebrow}>Canoas ativas</p>
            <h2>{vocabulary.resource_label}s cadastrados</h2>
          </div>
        </div>
        <div className={styles.list}>
          {resources.length > 0 ? (
            resources.map((resource) => (
              <div className={styles.listItem} key={resource.id}>
                <strong>{resource.name}</strong>
                <span>capacidade {resource.capacity_maxima}</span>
              </div>
            ))
          ) : (
            <p className={styles.empty}>
              Nenhum {vocabulary.resource_label.toLowerCase()} cadastrado.
            </p>
          )}
        </div>
      </section>
    </AdminShell>
  );
}
