import Link from "next/link";
import { notFound } from "next/navigation";

import {
  getCompanyOperationalSessionById,
  getCompanyTrainingLibrary,
  getOperationalSessionParticipants,
} from "../../../../../../lib/saas/queries";
import { getManageAdminContext } from "../../../admin-context";
import { AdminShell } from "../../../admin-shell";
import styles from "../../../admin.module.css";
import {
  getPublicSpotsForResource,
  vesselLabels,
} from "../../grade/base-schedule-utils";
import { SessionTrainingForm } from "../../session-training-form";
import { AttendanceList } from "./attendance-list";

type SessionDetailPageProps = {
  params: Promise<{
    sessionId: string;
    slug: string;
  }>;
};

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "long",
  timeZone: "America/Sao_Paulo",
  weekday: "long",
  year: "numeric",
});

function formatSessionDate(dateKey: string) {
  return dateFormatter.format(new Date(`${dateKey}T12:00:00-03:00`));
}

function statusLabel(status: string) {
  if (status === "published") {
    return "Publicada";
  }

  if (status === "cancelled") {
    return "Cancelada";
  }

  return "Rascunho";
}

export default async function SessionDetailPage({
  params,
}: SessionDetailPageProps) {
  const { sessionId, slug } = await params;
  const context = await getManageAdminContext(slug);
  const [session, trainingPlans, participants] = await Promise.all([
    getCompanyOperationalSessionById({
      companyId: context.company.id,
      sessionId,
    }),
    getCompanyTrainingLibrary(context.company.id),
    getOperationalSessionParticipants({ companyId: context.company.id, sessionId }),
  ]);

  if (!session) {
    notFound();
  }

  const publicSpots = session.resources.reduce(
    (total, item) => total + (item.resource ? getPublicSpotsForResource(item.resource) : 0),
    0,
  );
  const trainingTitle =
    session.training_plan_version?.training_plan?.title ?? "Treino ainda não definido";

  return (
    <AdminShell
      active="agenda"
      context={context}
      subtitle="Revise a sessão concreta, canoas e treino programado para esta data."
      title="Detalhes da sessão"
    >
      <div className={styles.backRow}>
        <Link className={styles.secondaryButton} href={`/admin/${context.company.slug}/agenda`}>
          Voltar para Agenda
        </Link>
        {context.role === "admin" ? (
          <Link
            className={styles.primaryButton}
            href={`/admin/${context.company.slug}/agenda/novo?sessionId=${session.id}`}
          >
            Editar sessão
          </Link>
        ) : null}
      </div>

      <section className={styles.trainingDetailHero}>
        <div>
          <p className={styles.eyebrow}>{statusLabel(session.status)}</p>
          <h2>{session.group_name}</h2>
          <p>
            {formatSessionDate(session.session_date)} · {session.start_time.slice(0, 5)} ·{" "}
            {session.duration_minutes} min · {session.location?.name || "Base não definida"}
          </p>
        </div>
        <span className={styles.statusBadge}>{publicSpots} vagas públicas</span>
      </section>

      <section className={styles.trainingDetailGrid}>
        <div className={styles.trainingPrimaryPanel}>
          <div className={styles.sectionHeadBalanced}>
            <div>
              <p className={styles.eyebrow}>Treino do dia</p>
              <h2>{trainingTitle}</h2>
            </div>
          </div>
          <SessionTrainingForm
            companyId={context.company.id}
            currentTrainingPlanVersionId={session.training_plan_version_id}
            sessionId={session.id}
            slug={context.company.slug}
            trainingPlans={trainingPlans}
          />
        </div>

        <aside className={styles.trainingSidePanel}>
          <p className={styles.eyebrow}>Operação</p>
          <div className={styles.vesselSummaryList}>
            <div>
              <span>Base</span>
              <strong>{session.location?.name || "Não definida"}</strong>
            </div>
            <div>
              <span>Treinador</span>
              <strong>{session.coach?.name || "Treinador"}</strong>
            </div>
            <div>
              <span>Canoas</span>
              <strong>{session.resources.length}</strong>
            </div>
            <div>
              <span>Origem</span>
              <strong>{session.base_schedule_id ? "Recorrência" : "Avulsa"}</strong>
            </div>
          </div>
        </aside>
      </section>

      <section className={styles.trainingPrimaryPanel}>
        <div className={styles.sectionHeadBalanced}>
          <div>
            <p className={styles.eyebrow}>Chamada</p>
            <h2>Presença dos remadores</h2>
          </div>
          <span className={styles.statusBadge}>{participants.length} reservados</span>
        </div>
        <AttendanceList
          companyId={context.company.id}
          participants={participants}
          sessionId={session.id}
          slug={context.company.slug}
        />
      </section>

      <section className={styles.trainingPrimaryPanel}>
        <div className={styles.sectionHeadBalanced}>
          <div>
            <p className={styles.eyebrow}>Canoas vinculadas</p>
            <h2>Frota da sessão</h2>
          </div>
        </div>
        <div className={styles.baseResourceGrid}>
          {session.resources.map((item) => (
            <div className={styles.baseResourceOption} key={item.resource_id}>
              <span className={styles.vesselAvatar} aria-hidden="true">
                {(item.resource?.name || "C").slice(0, 1)}
              </span>
              <span>
                <strong>{item.resource?.name || "Canoa"}</strong>
                <small>
                  {item.resource?.vessel_class
                    ? vesselLabels[item.resource.vessel_class]
                    : "Classe não definida"}{" "}
                  · capacidade {item.resource?.capacity_maxima ?? "--"}
                </small>
              </span>
            </div>
          ))}
        </div>
      </section>
    </AdminShell>
  );
}
