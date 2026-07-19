import {
  getCompanyServices,
  getCompanyWeeklyWorkouts,
} from "../../../../lib/saas/queries";
import { getManageAdminContext } from "../admin-context";
import { AdminShell } from "../admin-shell";
import styles from "../admin.module.css";
import { ServiceForm, WeeklyWorkoutForm } from "../tenant-catalog-forms";

type AdminTrainingPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function AdminTrainingPage({
  params,
}: AdminTrainingPageProps) {
  const { slug } = await params;
  const context = await getManageAdminContext(slug);
  const { company, vocabulary } = context;
  const [services, weeklyWorkouts] = await Promise.all([
    getCompanyServices(company.id),
    getCompanyWeeklyWorkouts(company.id),
  ]);

  return (
    <AdminShell
      active="treinos"
      context={context}
      subtitle="Organize o catálogo de treinos e o conteúdo técnico da semana."
      title="Treinos"
    >
      <section className={styles.catalogGrid}>
        <article className={styles.panel} id="criar-treino">
          <div className={styles.sectionHead}>
            <div>
              <p className={styles.eyebrow}>Catálogo</p>
              <h2>Novo {vocabulary.service_label.toLowerCase()}</h2>
            </div>
          </div>
          <ServiceForm
            companyId={company.id}
            slug={company.slug}
            vocabulary={vocabulary}
          />
        </article>

        <article className={styles.panel}>
          <div className={styles.sectionHead}>
            <div>
              <p className={styles.eyebrow}>Semana</p>
              <h2>Plano de treino</h2>
            </div>
          </div>
          <WeeklyWorkoutForm
            companyId={company.id}
            slug={company.slug}
            vocabulary={vocabulary}
          />
        </article>
      </section>

      <section className={styles.twoColumn}>
        <article className={styles.panel}>
          <h2>{vocabulary.service_label}s cadastrados</h2>
          <div className={styles.list}>
            {services.length > 0 ? (
              services.map((service) => (
                <div className={styles.listItemVertical} key={service.id}>
                  <div className={styles.listItem}>
                    <strong>{service.name}</strong>
                    <span>{service.duration_minutes} min</span>
                  </div>
                  {service.description ? (
                    <p className={styles.itemDescription}>{service.description}</p>
                  ) : null}
                </div>
              ))
            ) : (
              <p className={styles.empty}>
                Nenhum {vocabulary.service_label.toLowerCase()} cadastrado.
              </p>
            )}
          </div>
        </article>

        <article className={styles.panel}>
          <h2>Treinos da semana</h2>
          <div className={styles.list}>
            {weeklyWorkouts.length > 0 ? (
              weeklyWorkouts.map((workout) => (
                <div className={styles.listItemVertical} key={workout.id}>
                  <div className={styles.listItem}>
                    <strong>{workout.title}</strong>
                    <span>dia {workout.weekday}</span>
                  </div>
                  {workout.description ? (
                    <p className={styles.itemDescription}>
                      {workout.description}
                    </p>
                  ) : null}
                </div>
              ))
            ) : (
              <p className={styles.empty}>Nenhum treino semanal publicado.</p>
            )}
          </div>
        </article>
      </section>
    </AdminShell>
  );
}
