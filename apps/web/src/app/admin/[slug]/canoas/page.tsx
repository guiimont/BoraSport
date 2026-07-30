import Link from "next/link";

import type { Resource, VesselClass, VesselStatus } from "../../../../types/saas";
import { getCompanyResources } from "../../../../lib/saas/queries";
import { getManageAdminContext } from "../admin-context";
import { AdminShell } from "../admin-shell";
import styles from "../admin.module.css";

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
  disponivel: "Disponível",
  inativa: "Inativa",
  manutencao: "Em manutencao",
};

function normalizeText(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function getResourceStatus(resource: Resource): VesselStatus {
  return resource.vessel_status ?? (resource.is_active ? "disponivel" : "inativa");
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
  const { company } = context;
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

  return (
    <AdminShell
      active="canoas"
      context={context}
      eyebrow="Operação do clube"
      showSessionBar={false}
      subtitle="Organize a frota e localize rapidamente quais canoas estão disponíveis para a operação."
      title="Canoas"
    >
      <section className={styles.vesselTopStrip} aria-label="Resumo da frota">
        <p>
          <strong>{resources.length}</strong> canoas
          <span aria-hidden="true"> · </span>
          <strong>{availableCount}</strong> disponiveis
          <span aria-hidden="true"> · </span>
          <strong>{maintenanceCount}</strong> em manutencao
        </p>
        <Link
          className={styles.primaryButtonLink}
          href={`/admin/${company.slug}/canoas/nova`}
        >
          Nova canoa
        </Link>
      </section>

      <details className={styles.vesselFilterPanel}>
        <summary>Filtrar</summary>
        <form className={styles.vesselFilterForm}>
          <label>
            Buscar
            <input
              defaultValue={filters.q}
              name="q"
              placeholder="Nome ou identificação"
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
              <option value="sem-classe">Classe não definida</option>
            </select>
          </label>
          <label>
            Situacao
            <select defaultValue={filters.situacao} name="situacao">
              <option value="todas">Todas</option>
              <option value="disponivel">Disponível</option>
              <option value="manutencao">Em manutencao</option>
              <option value="inativa">Inativa</option>
            </select>
          </label>
          <button className={styles.secondaryButton} type="submit">
            Aplicar filtros
          </button>
        </form>
      </details>

      {filteredResources.length > 0 ? (
        <section className={styles.vesselList} aria-label="Frota de canoas">
          <div className={styles.vesselListHeader} aria-hidden="true">
            <span>Canoa</span>
            <span>Classe</span>
            <span>Capacidade</span>
            <span>Situação</span>
            <span>Detalhes</span>
          </div>
          {filteredResources.map((resource) => {
            const status = getResourceStatus(resource);
            const vesselClass = resource.vessel_class
              ? vesselLabels[resource.vessel_class]
              : "Classe não definida";

            return (
              <Link
                className={styles.vesselListItem}
                href={`/admin/${company.slug}/canoas/${resource.id}`}
                key={resource.id}
              >
                <div className={styles.vesselNameCell}>
                  <strong>{resource.name}</strong>
                  {resource.internal_code ? (
                    <span>{resource.internal_code}</span>
                  ) : null}
                </div>
                <span className={styles.vesselClassCell}>{vesselClass}</span>
                <span className={styles.vesselCapacityCell}>
                  {resource.capacity_maxima}
                </span>
                <span className={styles.vesselMobileMeta}>
                  {vesselClass} · capacidade {resource.capacity_maxima}
                </span>
                <span className={styles[`vesselStatus_${status}`]}>
                  {statusLabels[status]}
                </span>
                <span className={styles.vesselDetailsCell}>
                  Detalhes <span aria-hidden="true">&gt;</span>
                </span>
              </Link>
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
