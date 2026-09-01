import { getCompanyLocations } from "../../../../lib/saas/queries";
import { getManageAdminContext } from "../admin-context";
import { AdminShell } from "../admin-shell";
import styles from "../admin.module.css";
import { LocationForm } from "./location-form";

export default async function AdminLocationsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const context = await getManageAdminContext(slug);
  const locations = await getCompanyLocations(context.company.id);

  return (
    <AdminShell
      active="bases"
      context={context}
      eyebrow="Operação do clube"
      showSessionBar={false}
      subtitle="Organize os locais onde o clube guarda canoas e realiza suas remadas."
      title="Bases"
    >
      <div className={styles.builderMain}>
        <LocationForm companyId={context.company.id} slug={context.company.slug} />
        {locations.length > 0 ? (
          locations.map((location) => (
            <LocationForm companyId={context.company.id} key={location.id} location={location} slug={context.company.slug} />
          ))
        ) : (
          <section className={styles.emptyState}>
            <h2>Nenhuma base cadastrada</h2>
            <p>Cadastre o primeiro local antes de publicar novos horários.</p>
          </section>
        )}
      </div>
    </AdminShell>
  );
}
