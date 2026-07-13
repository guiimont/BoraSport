import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import {
  companyHasMembers,
  getCompanyBookings,
  getCompanyBySlug,
  getCompanyLandingPage,
  getCompanyResources,
  getCompanyServices,
  getCompanySlots,
  getCurrentUser,
  getUserCompanyRole,
} from "../../../lib/saas/queries";
import type { VocabularyConfig } from "../../../types/saas";
import { ClaimCompanyForm } from "./claim-company-form";
import { CompanyConfigurationForm } from "./company-configuration-form";
import { LandingPageForm } from "./landing-page-form";
import styles from "./admin.module.css";
import { TenantCatalogForms } from "./tenant-catalog-forms";

type AdminPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

const defaultVocabulary: Required<VocabularyConfig> = {
  booking_label: "Reserva",
  professional_label: "Profissional",
  resource_label: "Recurso",
  service_label: "Servico",
};

function normalizeVocabulary(
  vocabulary?: VocabularyConfig | null,
): Required<VocabularyConfig> {
  return {
    booking_label: vocabulary?.booking_label || defaultVocabulary.booking_label,
    professional_label:
      vocabulary?.professional_label || defaultVocabulary.professional_label,
    resource_label:
      vocabulary?.resource_label || defaultVocabulary.resource_label,
    service_label: vocabulary?.service_label || defaultVocabulary.service_label,
  };
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return "--";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <article className={styles.statCard}>
      <p>{label}</p>
      <strong>{value}</strong>
    </article>
  );
}

function getUserLabel(user: Awaited<ReturnType<typeof getCurrentUser>>) {
  if (!user) {
    return "Usuario";
  }

  const metadataName =
    typeof user.user_metadata?.name === "string"
      ? user.user_metadata.name
      : null;

  return metadataName || user.email || "Usuario Bora";
}

function ModuleCard({
  description,
  status,
  title,
}: {
  description: string;
  status: "Ativo" | "Base pronta" | "Planejado";
  title: string;
}) {
  return (
    <article className={styles.moduleCard}>
      <div>
        <strong>{title}</strong>
        <p>{description}</p>
      </div>
      <span
        className={
          status === "Ativo"
            ? styles.moduleStatusActive
            : status === "Base pronta"
              ? styles.moduleStatusReady
              : styles.moduleStatusPlanned
        }
      >
        {status}
      </span>
    </article>
  );
}

export default async function AdminPage({ params }: AdminPageProps) {
  const { slug } = await params;
  const company = await getCompanyBySlug(slug);

  if (!company) {
    notFound();
  }

  const user = await getCurrentUser();

  if (!user) {
    redirect(`/login?next=/admin/${company.slug}`);
  }

  const [role, hasMembers] = await Promise.all([
    getUserCompanyRole(company.id, user.id),
    companyHasMembers(company.id),
  ]);
  const canManageTenant = role === "admin" || role === "professional";
  const canClaimTenant = !hasMembers;

  if (!canManageTenant && !canClaimTenant) {
    notFound();
  }

  const [resources, services, slots, bookings, landingPage] = await Promise.all([
    getCompanyResources(company.id),
    getCompanyServices(company.id),
    getCompanySlots(company.id),
    getCompanyBookings(company.id),
    getCompanyLandingPage(company.id),
  ]);

  const vocabulary = normalizeVocabulary(company.vocabulary_config);
  const userLabel = getUserLabel(user);

  if (!canManageTenant) {
    return (
      <main className={styles.page}>
        <section className={styles.claimPanel}>
          <p className={styles.eyebrow}>Primeiro administrador</p>
          <h1>{company.name}</h1>
          <p className={styles.muted}>
            Este tenant ainda nao tem membros. Para operar o painel, assuma o
            tenant com sua conta autenticada. Depois disso, o acesso passa a ser
            controlado por memberships e RLS.
          </p>

          <ClaimCompanyForm companyId={company.id} slug={company.slug} />
        </section>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div>
            <p className={styles.eyebrow}>Bora SaaS / Painel do gestor</p>
            <h1>{company.name}</h1>
            <p className={styles.headerText}>
              Voce esta administrando o tenant <strong>{company.slug}</strong>.
            </p>
            <div className={styles.sessionBar}>
              <span>Logado como {userLabel}</span>
              <span>Perfil: {role}</span>
              <span>Modalidade: {company.type_de_negocio || "generico"}</span>
            </div>
          </div>

          <nav className={styles.headerActions} aria-label="Acoes do gestor">
            <Link className={styles.secondaryButton} href={`/clube/${company.slug}`}>
              Ver pagina publica
            </Link>
            <Link className={styles.primaryButtonLink} href="/perfil">
              Meu perfil
            </Link>
          </nav>
        </div>
      </header>

      <div className={styles.content}>
        <section className={styles.panel}>
          <div className={styles.sectionHead}>
            <div>
              <p className={styles.eyebrow}>Ecossistema do tenant</p>
              <h2>Modulos de gestao</h2>
              <p className={styles.muted}>
                O agendamento continua sendo o centro. Os demais modulos
                apoiam venda, atendimento, dados e relacionamento.
              </p>
            </div>
          </div>
          <div className={styles.moduleGrid}>
            <ModuleCard
              description="Horarios, vagas, recursos, reservas e treinos da semana para os alunos."
              status="Ativo"
              title="Agenda e atividades"
            />
            <ModuleCard
              description="Templates editaveis para paginas de venda do clube, planos e experiencias."
              status={landingPage?.is_published ? "Ativo" : "Base pronta"}
              title="Landing pages"
            />
            <ModuleCard
              description="Central de conversas, numero principal do clube, funil de atendimento e historico."
              status="Planejado"
              title="Atendimento CRM"
            />
            <ModuleCard
              description="Garmin, relogios inteligentes e progresso individual/turma por modalidade."
              status="Base pronta"
              title="Performance esportiva"
            />
          </div>
        </section>

        <section className={styles.statGrid} aria-label="Resumo do tenant">
          <StatCard label={vocabulary.resource_label} value={resources.length} />
          <StatCard label={vocabulary.service_label} value={services.length} />
          <StatCard label="Horarios futuros" value={slots.length} />
          <StatCard label={vocabulary.booking_label} value={bookings.length} />
        </section>

        <section className={styles.panel}>
          <div className={styles.sectionHead}>
            <div>
              <p className={styles.eyebrow}>Add-on de vendas</p>
              <h2>Landing page</h2>
              <p className={styles.muted}>
                Crie uma pagina simples de captacao integrada com a agenda do
                tenant. Depois ela pode virar um plano cobrado a parte.
              </p>
            </div>
            <Link className={styles.secondaryButton} href={`/site/${company.slug}`}>
              Ver landing
            </Link>
          </div>
          <LandingPageForm
            companyId={company.id}
            landingPage={landingPage}
            slug={company.slug}
          />
        </section>

        <section className={styles.panel}>
          <div className={styles.sectionHead}>
            <div>
              <p className={styles.eyebrow}>Configuracao da atividade</p>
              <h2>Vocabulario e nicho do tenant</h2>
              <p className={styles.muted}>
                O Bora usa a mesma agenda para canoa, crossfit, pilates,
                futvolei e outros nichos. O tenant define os termos e a
                atividade aqui.
              </p>
            </div>
            <span className={styles.pill}>
              {company.type_de_negocio || "generico"}
            </span>
          </div>

          <CompanyConfigurationForm
            companyId={company.id}
            slug={company.slug}
            typeDeNegocio={company.type_de_negocio || "generico"}
            vocabulary={vocabulary}
          />
        </section>

        <TenantCatalogForms
          companyId={company.id}
          resources={resources}
          services={services}
          slug={company.slug}
          vocabulary={vocabulary}
        />

        <section className={styles.twoColumn}>
          <article className={styles.panel}>
            <h2>{vocabulary.resource_label}s</h2>
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
          </article>

          <article className={styles.panel}>
            <h2>{vocabulary.service_label}s</h2>
            <div className={styles.list}>
              {services.length > 0 ? (
                services.map((service) => (
                  <div className={styles.listItemVertical} key={service.id}>
                    <div className={styles.listItem}>
                      <strong>{service.name}</strong>
                      <span>{service.duration_minutes} min</span>
                    </div>
                    {service.description ? (
                      <p className={styles.itemDescription}>
                        {service.description}
                      </p>
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
        </section>

        <section className={styles.panel}>
          <div className={styles.sectionHead}>
            <div>
              <p className={styles.eyebrow}>Agenda publicada</p>
              <h2>Proximos horarios</h2>
            </div>
          </div>

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Horario</th>
                  <th>{vocabulary.service_label}</th>
                  <th>{vocabulary.resource_label}</th>
                  <th>Vagas</th>
                </tr>
              </thead>
              <tbody>
                {slots.map((slot) => (
                  <tr key={slot.id}>
                    <td>{formatDateTime(slot.start_time)}</td>
                    <td>{slot.services?.name || "--"}</td>
                    <td>{slot.resources?.name || "--"}</td>
                    <td>
                      {slot.spots_occupied}/{slot.spots_total}
                    </td>
                  </tr>
                ))}
                {slots.length === 0 ? (
                  <tr>
                    <td className={styles.emptyCell} colSpan={4}>
                      Nenhum horario futuro publicado.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
