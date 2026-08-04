import Link from "next/link";

import { getCompanyTrainingLibrary } from "../../../../lib/saas/queries";
import type {
  TrainingPlanLibraryItem,
  TrainingPlanStatus,
  TrainingMode,
  TrainingVersionLevel,
  TrainingVersionStatus,
} from "../../../../types/saas";
import { getManageAdminContext } from "../admin-context";
import { AdminShell } from "../admin-shell";
import styles from "../admin.module.css";

type AdminTrainingPageProps = {
  params: Promise<{
    slug: string;
  }>;
  searchParams?: Promise<{
    formato?: string;
    nivel?: string;
    q?: string;
    status?: string;
  }>;
};

const statusLabels: Record<TrainingPlanStatus | TrainingVersionStatus, string> = {
  active: "Ativo",
  archived: "Arquivado",
  draft: "Rascunho",
  published: "Publicado",
};

const levelLabels: Record<TrainingVersionLevel, string> = {
  avancado: "Avançado",
  competicao: "Competição",
  iniciante: "Iniciante",
  intermediario: "Intermediário",
  personalizado: "Personalizado",
};

const trainingModeLabels: Record<TrainingMode, string> = {
  coletivo: "Coletivo",
  individual: "Individual",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatDuration(seconds: number | null | undefined) {
  if (!seconds) {
    return "Duração não definida";
  }

  return `${Math.round(seconds / 60)} min`;
}

function getLatestVersion(plan: TrainingPlanLibraryItem) {
  return [...plan.training_plan_versions].sort(
    (a, b) => b.version_number - a.version_number,
  )[0];
}

function applyFilters(
  plans: TrainingPlanLibraryItem[],
  filters: {
    formato: string;
    nivel: string;
    q: string;
    status: string;
  },
) {
  return plans.filter((plan) => {
    const latestVersion = getLatestVersion(plan);
    const normalizedQuery = filters.q.toLowerCase();
    const matchesQuery =
      !normalizedQuery ||
      plan.title.toLowerCase().includes(normalizedQuery) ||
      (plan.objective?.toLowerCase().includes(normalizedQuery) ?? false);
    const matchesStatus =
      !filters.status ||
      plan.status === filters.status ||
      latestVersion?.status === filters.status;
    const matchesLevel = !filters.nivel || latestVersion?.level === filters.nivel;
    const matchesMode = !filters.formato || plan.training_mode === filters.formato;

    return matchesQuery && matchesStatus && matchesLevel && matchesMode;
  });
}

export default async function AdminTrainingPage({
  params,
  searchParams,
}: AdminTrainingPageProps) {
  const { slug } = await params;
  const filtersInput = (await searchParams) ?? {};
  const context = await getManageAdminContext(slug);
  const { company } = context;
  const trainingPlans = await getCompanyTrainingLibrary(company.id);
  const filters = {
    formato: filtersInput.formato ?? "",
    nivel: filtersInput.nivel ?? "",
    q: filtersInput.q ?? "",
    status: filtersInput.status ?? "",
  };
  const filteredPlans = applyFilters(trainingPlans, filters);

  return (
    <AdminShell
      active="treinos"
      context={context}
      eyebrow="Planejamento esportivo"
      showSessionBar={false}
      subtitle="Crie, versiona e publique prescrições estruturadas para os treinos do clube."
      title="Treinos"
    >
      <section className={styles.trainingLibraryHeader}>
        <div>
          <p className={styles.eyebrow}>Biblioteca estruturada</p>
          <h2>Treinos criados</h2>
          <p className={styles.muted}>
            A agenda define data, horário, turma e canoa. Aqui ficam os treinos
            estruturados que poderão ser reutilizados depois.
          </p>
        </div>
        <Link
          className={styles.primaryButtonLink}
          href={`/admin/${company.slug}/treinos/novo`}
        >
          Novo treino
        </Link>
      </section>

      <form className={styles.trainingToolbar}>
        <label className={styles.trainingSearchField}>
          <span>Buscar</span>
          <input
            defaultValue={filters.q}
            name="q"
            placeholder="Nome ou objetivo"
            type="search"
          />
        </label>

        <label>
          <span>Status</span>
          <select defaultValue={filters.status} name="status">
            <option value="">Todos</option>
            <option value="active">Ativo</option>
            <option value="draft">Rascunho</option>
            <option value="published">Publicado</option>
            <option value="archived">Arquivado</option>
          </select>
        </label>

        <label>
          <span>Nível</span>
          <select defaultValue={filters.nivel} name="nivel">
            <option value="">Todos</option>
            {Object.entries(levelLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Formato</span>
          <select defaultValue={filters.formato} name="formato">
            <option value="">Todos</option>
            {Object.entries(trainingModeLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <button className={styles.secondaryButton} type="submit">
          Filtrar
        </button>
      </form>

      {trainingPlans.length === 0 ? (
        <section className={styles.trainingEmptyState}>
          <p className={styles.eyebrow}>Primeiro treino</p>
          <h2>Sua biblioteca de treinos começa aqui.</h2>
          <p>Crie o primeiro treino estruturado do clube.</p>
          <Link
            className={styles.primaryButtonLink}
            href={`/admin/${company.slug}/treinos/novo`}
          >
            Criar primeiro treino
          </Link>
        </section>
      ) : (
        <section className={styles.trainingLibraryList}>
          {filteredPlans.length > 0 ? (
            filteredPlans.map((plan) => {
              const latestVersion = getLatestVersion(plan);

              return (
                <article className={styles.trainingPlanCard} key={plan.id}>
                  <div className={styles.trainingPlanMain}>
                    <div>
                      <span className={styles.trainingPlanVessel}>
                        {trainingModeLabels[plan.training_mode]}
                      </span>
                      <h3>{plan.title}</h3>
                      <p>
                        {plan.objective ||
                          "Objetivo ainda não informado para este treino."}
                      </p>
                    </div>
                    <div className={styles.trainingPlanBadges}>
                      <span>{statusLabels[plan.status]}</span>
                      {latestVersion ? (
                        <span>{statusLabels[latestVersion.status]}</span>
                      ) : null}
                    </div>
                  </div>

                  <dl className={styles.trainingPlanMeta}>
                    <div>
                      <dt>Versões</dt>
                      <dd>{plan.training_plan_versions.length}</dd>
                    </div>
                    <div>
                      <dt>Nível</dt>
                      <dd>
                        {latestVersion
                          ? levelLabels[latestVersion.level]
                          : "Sem versão"}
                      </dd>
                    </div>
                    <div>
                      <dt>Duração</dt>
                      <dd>
                        {formatDuration(
                          latestVersion?.duration_seconds ??
                            plan.default_duration_seconds,
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt>Atualizado</dt>
                      <dd>{formatDate(plan.updated_at)}</dd>
                    </div>
                  </dl>

                  <div className={styles.trainingPlanActions}>
                    <Link
                      className={styles.secondaryButton}
                      href={`/admin/${company.slug}/treinos/${plan.id}`}
                    >
                      Abrir treino
                    </Link>
                    {latestVersion?.status === "draft" ? (
                      <Link
                        className={styles.primaryButtonLink}
                        href={`/admin/${company.slug}/treinos/${plan.id}`}
                      >
                        Editar rascunho
                      </Link>
                    ) : null}
                  </div>
                </article>
              );
            })
          ) : (
            <div className={styles.trainingEmptyState}>
              <h2>Nenhum treino encontrado.</h2>
              <p>Ajuste os filtros para ver outros treinos da biblioteca.</p>
            </div>
          )}
        </section>
      )}
    </AdminShell>
  );
}
