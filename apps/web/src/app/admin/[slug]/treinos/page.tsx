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
  const nextPublishedWorkout = weeklyWorkouts[0] ?? null;

  return (
    <AdminShell
      active="treinos"
      context={context}
      eyebrow="Planejamento esportivo"
      showSessionBar={false}
      subtitle="Planeje a semana, publique orientações e mantenha uma biblioteca simples de treinos."
      title="Treinos"
    >
      <section className={styles.trainingSummary} aria-label="Resumo de treinos">
        <article className={styles.trainingStatCard}>
          <span>Biblioteca</span>
          <strong>{services.length}</strong>
          <p>treinos cadastrados</p>
        </article>
        <article className={styles.trainingStatCard}>
          <span>Semana</span>
          <strong>{weeklyWorkouts.length}</strong>
          <p>publicações ativas</p>
        </article>
        <article className={styles.trainingStatCardWide}>
          <span>Próximo publicado</span>
          <strong>{nextPublishedWorkout?.title ?? "Nenhum treino publicado"}</strong>
          <p>
            {nextPublishedWorkout
              ? `Dia ${nextPublishedWorkout.weekday}`
              : "Use o plano da semana para orientar os remadores."}
          </p>
        </article>
      </section>

      <section className={styles.trainingWorkspace}>
        <article className={styles.trainingPrimaryPanel}>
          <div className={styles.sectionHeadBalanced}>
            <div>
              <p className={styles.eyebrow}>Semana</p>
              <h2>Plano da semana</h2>
              <p className={styles.muted}>
                Publique o treino que o remador vai encontrar antes de chegar na
                base.
              </p>
            </div>
          </div>
          <WeeklyWorkoutForm
            companyId={company.id}
            slug={company.slug}
            vocabulary={vocabulary}
          />
        </article>

        <aside className={styles.trainingSidePanel} id="criar-treino">
          <div className={styles.sectionHeadBalanced}>
            <div>
              <p className={styles.eyebrow}>Biblioteca</p>
              <h2>Treino rápido</h2>
              <p className={styles.muted}>
                Cadastre uma opção básica para publicar na agenda.
              </p>
            </div>
          </div>
          <ServiceForm
            companyId={company.id}
            slug={company.slug}
            variant="trainingQuick"
            vocabulary={vocabulary}
          />
        </aside>
      </section>

      <section className={styles.trainingLists}>
        <article className={styles.panel}>
          <div className={styles.sectionHeadBalanced}>
            <div>
              <p className={styles.eyebrow}>Biblioteca</p>
              <h2>Biblioteca atual</h2>
            </div>
            {services.length === 0 ? (
              <a className={styles.secondaryButton} href="#criar-treino">
                Criar primeiro treino
              </a>
            ) : null}
          </div>
          <div className={styles.list}>
            {services.length > 0 ? (
              services.map((service) => (
                <div className={styles.trainingListItem} key={service.id}>
                  <div>
                    <strong>{service.name}</strong>
                    {service.description ? (
                      <p className={styles.itemDescription}>
                        {service.description}
                      </p>
                    ) : null}
                  </div>
                  <span>{service.duration_minutes} min</span>
                </div>
              ))
            ) : (
              <div className={styles.emptyStateCompact}>
                <strong>Nenhum treino cadastrado.</strong>
                <p>Crie um treino rápido para começar a publicar horários.</p>
              </div>
            )}
          </div>
        </article>

        <article className={styles.panel}>
          <div className={styles.sectionHeadBalanced}>
            <div>
              <p className={styles.eyebrow}>Publicados</p>
              <h2>Treinos da semana</h2>
            </div>
          </div>
          <div className={styles.list}>
            {weeklyWorkouts.length > 0 ? (
              weeklyWorkouts.map((workout) => (
                <div className={styles.trainingListItem} key={workout.id}>
                  <div>
                    <strong>{workout.title}</strong>
                    {workout.description ? (
                      <p className={styles.itemDescription}>
                        {workout.description}
                      </p>
                    ) : null}
                  </div>
                  <span>Dia {workout.weekday}</span>
                </div>
              ))
            ) : (
              <div className={styles.emptyStateCompact}>
                <strong>Nenhum treino publicado nesta semana.</strong>
                <p>Use o plano da semana para publicar a orientação do dia.</p>
              </div>
            )}
          </div>
        </article>
      </section>
    </AdminShell>
  );
}
