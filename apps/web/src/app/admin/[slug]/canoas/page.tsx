import Link from "next/link";

import type {
  DefaultSteererPolicy,
  Resource,
  VesselClass,
  VesselStatus,
} from "../../../../types/saas";
import { getCompanyResources } from "../../../../lib/saas/queries";
import { getManageAdminContext } from "../admin-context";
import { AdminShell } from "../admin-shell";
import styles from "../admin.module.css";
import { CanoaStatusAction } from "./canoa-status-action";

type AdminResourcesPageProps = {
  params: Promise<{
    slug: string;
  }>;
  searchParams?: Promise<{
    classe?: string;
    q?: string;
    situacao?: string;
  }>;
};

const vesselLabels: Record<VesselClass, string> = {
  oc1: "OC1",
  oc4: "OC4",
  oc6: "OC6",
  outro: "Outro",
  v1: "V1",
  v3: "V3",
  v6: "V6",
};

const statusLabels: Record<VesselStatus, string> = {
  disponivel: "Disponivel",
  inativa: "Inativa",
  manutencao: "Em manutencao",
};

const steererLabels: Record<DefaultSteererPolicy, string> = {
  aluno: "Aluno como leme",
  definir_treino: "Definir em cada treino",
  instrutor: "Instrutor como leme",
};

function normalizeText(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function getResourceStatus(resource: Resource): VesselStatus {
  return resource.vessel_status ?? (resource.is_active ? "disponivel" : "inativa");
}

function getPublicSpots(resource: Resource) {
  if (resource.default_steerer_policy === "instrutor") {
    return Math.max(0, resource.capacity_maxima - 1);
  }

  return resource.capacity_maxima;
}

function matchesClass(resource: Resource, value: string) {
  if (!value || value === "todas") {
    return true;
  }

  if (value === "sem-classe") {
    return !resource.vessel_class;
  }

  return resource.vessel_class === value;
}

function matchesStatus(resource: Resource, value: string) {
  if (!value || value === "todas") {
    return true;
  }

  return getResourceStatus(resource) === value;
}

function filterResources(
  resources: Resource[],
  filters: { classe: string; q: string; situacao: string },
) {
  const query = normalizeText(filters.q);

  return resources.filter((resource) => {
    const searchable = normalizeText(
      [
        resource.name,
        resource.internal_code,
        resource.vessel_class ? vesselLabels[resource.vessel_class] : null,
      ]
        .filter(Boolean)
        .join(" "),
    );

    return (
      (!query || searchable.includes(query)) &&
      matchesClass(resource, filters.classe) &&
      matchesStatus(resource, filters.situacao)
    );
  });
}

export default async function AdminResourcesPage({
  params,
  searchParams,
}: AdminResourcesPageProps) {
  const { slug } = await params;
  const context = await getManageAdminContext(slug);
  const { company, vocabulary } = context;
  const resources = await getCompanyResources(company.id);
  const resolvedSearchParams = (await searchParams) ?? {};
  const filters = {
    classe: resolvedSearchParams.classe ?? "todas",
    q: resolvedSearchParams.q ?? "",
    situacao: resolvedSearchParams.situacao ?? "todas",
  };
  const filteredResources = filterResources(resources, filters);
  const availableCount = resources.filter(
    (resource) => getResourceStatus(resource) === "disponivel",
  ).length;
  const maintenanceCount = resources.filter(
    (resource) => getResourceStatus(resource) === "manutencao",
  ).length;
  const legacyCount = resources.filter((resource) => !resource.vessel_class).length;

  return (
    <AdminShell
      active="canoas"
      context={context}
      eyebrow="Operacao do clube"
      showSessionBar={false}
      subtitle="Organize a frota, capacidade e regra de leme que sustentam a futura agenda semanal."
      title="Canoas"
    >
      <section className={styles.builderHero}>
        <div className={styles.vesselHeroContent}>
          <div>
            <p className={styles.eyebrow}>Frota operacional</p>
            <h2>Biblioteca de canoas</h2>
            <p>
              Cadastre embarcacoes com classe, situacao e regra-padrao de leme.
              Registros antigos continuam visiveis para completar depois.
            </p>
          </div>
          <Link
            className={styles.primaryButtonLink}
            href={`/admin/${company.slug}/canoas/nova`}
          >
            Nova canoa
          </Link>
        </div>
      </section>

      <section className={styles.trainingSummary} aria-label="Resumo da frota">
        <div className={styles.trainingStatCard}>
          <span>Total</span>
          <strong>{resources.length}</strong>
          <p>canoas cadastradas</p>
        </div>
        <div className={styles.trainingStatCard}>
          <span>Disponiveis</span>
          <strong>{availableCount}</strong>
          <p>aptas para novas publicacoes futuras</p>
        </div>
        <div className={styles.trainingStatCard}>
          <span>Manutencao</span>
          <strong>{maintenanceCount}</strong>
          <p>exigem atencao operacional</p>
        </div>
        <div className={styles.trainingStatCard}>
          <span>Legadas</span>
          <strong>{legacyCount}</strong>
          <p>sem classe definida</p>
        </div>
      </section>

      <section className={styles.trainingToolbar} aria-label="Filtros da frota">
        <form className={styles.vesselFilterForm}>
          <label>
            Buscar
            <input
              defaultValue={filters.q}
              name="q"
              placeholder="Nome ou identificacao"
            />
          </label>
          <label>
            Classe
            <select defaultValue={filters.classe} name="classe">
              <option value="todas">Todas</option>
              <option value="v1">V1</option>
              <option value="oc1">OC1</option>
              <option value="v3">V3</option>
              <option value="oc4">OC4</option>
              <option value="v6">V6</option>
              <option value="oc6">OC6</option>
              <option value="outro">Outro</option>
              <option value="sem-classe">Classe nao definida</option>
            </select>
          </label>
          <label>
            Situacao
            <select defaultValue={filters.situacao} name="situacao">
              <option value="todas">Todas</option>
              <option value="disponivel">Disponivel</option>
              <option value="manutencao">Em manutencao</option>
              <option value="inativa">Inativa</option>
            </select>
          </label>
          <button className={styles.secondaryButton} type="submit">
            Filtrar
          </button>
        </form>
      </section>

      {filteredResources.length > 0 ? (
        <section className={styles.vesselLibraryGrid}>
          {filteredResources.map((resource) => {
            const status = getResourceStatus(resource);
            const collective = resource.capacity_maxima > 1;

            return (
              <article className={styles.vesselCard} key={resource.id}>
                <div className={styles.vesselCardHeader}>
                  <div>
                    <span className={styles.eyebrow}>
                      {resource.vessel_class
                        ? vesselLabels[resource.vessel_class]
                        : "Classe nao definida"}
                    </span>
                    <h2>{resource.name}</h2>
                  </div>
                  <span className={styles[`vesselStatus_${status}`]}>
                    {statusLabels[status]}
                  </span>
                </div>

                <dl className={styles.vesselMetrics}>
                  <div>
                    <dt>Capacidade</dt>
                    <dd>{resource.capacity_maxima}</dd>
                  </div>
                  <div>
                    <dt>Vagas futuras</dt>
                    <dd>{getPublicSpots(resource)}</dd>
                  </div>
                  <div>
                    <dt>Leme</dt>
                    <dd>
                      {collective
                        ? resource.default_steerer_policy
                          ? steererLabels[resource.default_steerer_policy]
                          : "Definir em cada treino"
                        : "Nao se aplica"}
                    </dd>
                  </div>
                </dl>

                {resource.internal_code || resource.operational_notes ? (
                  <div className={styles.vesselMetaBlock}>
                    {resource.internal_code ? (
                      <p>
                        <span>Identificacao</span>
                        <strong>{resource.internal_code}</strong>
                      </p>
                    ) : null}
                    {resource.operational_notes ? (
                      <p>
                        <span>Observacao</span>
                        <strong>{resource.operational_notes}</strong>
                      </p>
                    ) : null}
                  </div>
                ) : null}

                <div className={styles.vesselActions}>
                  <Link
                    className={styles.secondaryButton}
                    href={`/admin/${company.slug}/canoas/${resource.id}`}
                  >
                    Visualizar e editar
                  </Link>
                  <CanoaStatusAction
                    companyId={company.id}
                    resource={resource}
                    slug={company.slug}
                    status="manutencao"
                  />
                  <CanoaStatusAction
                    companyId={company.id}
                    resource={resource}
                    slug={company.slug}
                    status="disponivel"
                  />
                  <CanoaStatusAction
                    companyId={company.id}
                    resource={resource}
                    slug={company.slug}
                    status="inativa"
                  />
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        <section className={styles.trainingEmptyState}>
          <p className={styles.eyebrow}>Frota</p>
          <h2>Nenhuma canoa encontrada</h2>
          <p>
            Ajuste os filtros ou cadastre a primeira canoa operacional do clube.
          </p>
          <Link
            className={styles.primaryButtonLink}
            href={`/admin/${company.slug}/canoas/nova`}
          >
            Nova canoa
          </Link>
        </section>
      )}
    </AdminShell>
  );
}
