import { getManageAdminContext } from "../admin-context";
import { AdminShell } from "../admin-shell";
import { CompanyConfigurationForm } from "../company-configuration-form";
import styles from "../admin.module.css";

type AdminSettingsPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function AdminSettingsPage({
  params,
}: AdminSettingsPageProps) {
  const { slug } = await params;
  const context = await getManageAdminContext(slug);
  const { company, vocabulary } = context;

  return (
    <AdminShell
      active="configuracoes"
      context={context}
      subtitle="Ajuste vocabulário, modalidade e preferências já existentes do tenant."
      title="Configurações"
    >
      <section className={styles.panel}>
        <div className={styles.sectionHead}>
          <div>
            <p className={styles.eyebrow}>Configuração da atividade</p>
            <h2>Vocabulário e preferências</h2>
            <p className={styles.muted}>
              Estes termos controlam a linguagem usada nas telas do clube.
            </p>
          </div>
          <span className={styles.pill}>{company.type_de_negocio || "va'a"}</span>
        </div>

        <CompanyConfigurationForm
          companyId={company.id}
          slug={company.slug}
          typeDeNegocio={company.type_de_negocio || "generico"}
          vocabulary={vocabulary}
        />
      </section>
    </AdminShell>
  );
}
