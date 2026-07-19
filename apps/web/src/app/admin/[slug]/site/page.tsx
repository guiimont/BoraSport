import Link from "next/link";

import { getCompanyLandingPage } from "../../../../lib/saas/queries";
import { getManageAdminContext } from "../admin-context";
import { AdminShell } from "../admin-shell";
import { LandingPageForm } from "../landing-page-form";
import styles from "../admin.module.css";

type AdminSitePageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function AdminSitePage({ params }: AdminSitePageProps) {
  const { slug } = await params;
  const context = await getManageAdminContext(slug);
  const { company } = context;
  const landingPage = await getCompanyLandingPage(company.id);

  return (
    <AdminShell
      active="site"
      context={context}
      subtitle="Edite a presença pública do clube e publique uma landing integrada."
      title="Site do clube"
    >
      <section className={styles.panel}>
        <div className={styles.sectionHead}>
          <div>
            <p className={styles.eyebrow}>Landing pública</p>
            <h2>Conteúdo e publicação</h2>
            <p className={styles.muted}>
              Esta página é separada da agenda pública e ajuda o clube a captar
              novos remadores.
            </p>
          </div>
          <Link className={styles.secondaryButton} href={`/site/${company.slug}`}>
            Ver site
          </Link>
        </div>
        <LandingPageForm
          companyId={company.id}
          landingPage={landingPage}
          slug={company.slug}
        />
      </section>
    </AdminShell>
  );
}
