import Link from "next/link";
import { notFound } from "next/navigation";

import {
  getTrainingPlanVersions,
  getTrainingPlanWithVersion,
} from "../../../../../lib/saas/queries";
import type {
  BoraZone,
  TrainingBlock,
  TrainingBlockType,
  TrainingMode,
  TrainingVersionLevel,
  TrainingVersionStatus,
} from "../../../../../types/saas";
import { getManageAdminContext } from "../../admin-context";
import { AdminShell } from "../../admin-shell";
import styles from "../../admin.module.css";
import {
  archiveTrainingPlanAction,
  publishTrainingVersionAction,
} from "../actions";

type TrainingDetailPageProps = {
  params: Promise<{
    slug: string;
    trainingPlanId: string;
  }>;
  searchParams?: Promise<{
    versionId?: string;
  }>;
};

const statusLabels: Record<TrainingVersionStatus, string> = {
  archived: "Arquivada",
  draft: "Rascunho",
  published: "Publicada",
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

const blockTypeLabels: Record<TrainingBlockType, string> = {
  aquecimento: "Aquecimento",
  base: "Base",
  descanso_hidratacao: "Descanso e hidratação",
  forte: "Forte",
  largada: "Largada",
  recuperacao: "Recuperação",
  ritmo: "Ritmo",
  tecnica: "Técnica",
  volta_calma: "Volta à calma",
};

const zoneLabels: Record<BoraZone, string> = {
  z1_recuperar: "Z1 Recuperar",
  z2_base: "Z2 Base",
  z3_ritmo: "Z3 Ritmo",
  z4_forte: "Z4 Forte",
  z5_maximo: "Z5 Máximo",
};

function formatDuration(seconds: number | null | undefined) {
  if (!seconds) {
    return "Sem duração";
  }

  return `${Math.round(seconds / 60)} min`;
}

function getChildBlocks(blocks: TrainingBlock[], parentId: string) {
  return blocks.filter((block) => block.parent_block_id === parentId);
}

export default async function TrainingDetailPage({
  params,
  searchParams,
}: TrainingDetailPageProps) {
  const { slug, trainingPlanId } = await params;
  const { versionId } = (await searchParams) ?? {};
  const context = await getManageAdminContext(slug);
  const [trainingPlan, versions] = await Promise.all([
    getTrainingPlanWithVersion({
      companyId: context.company.id,
      trainingPlanId,
      versionId,
    }),
    getTrainingPlanVersions(trainingPlanId),
  ]);

  if (!trainingPlan) {
    notFound();
  }

  const { blocks, plan, version } = trainingPlan;
  const parentBlocks = blocks.filter((block) => !block.parent_block_id);
  const canPublish = version?.status === "draft";

  return (
    <AdminShell
      active="treinos"
      context={context}
      eyebrow="Treino estruturado"
      showSessionBar={false}
      subtitle="Visualize versões, blocos e estado da prescrição."
      title={plan.title}
    >
      <div className={styles.backRow}>
        <Link
          className={styles.secondaryButton}
          href={`/admin/${context.company.slug}/treinos`}
        >
          Voltar para biblioteca
        </Link>
      </div>

      <section className={styles.trainingDetailHero}>
        <div>
          <span className={styles.trainingPlanVessel}>
            {trainingModeLabels[plan.training_mode]}
          </span>
          <h2>{plan.title}</h2>
          <p>{plan.objective || "Objetivo ainda não informado."}</p>
        </div>
        <div className={styles.trainingPlanBadges}>
          <span>{plan.status === "archived" ? "Arquivado" : "Ativo"}</span>
          {version ? <span>{statusLabels[version.status]}</span> : null}
        </div>
      </section>

      <section className={styles.trainingDetailGrid}>
        <article className={styles.panel}>
          <div className={styles.sectionHeadBalanced}>
            <div>
              <p className={styles.eyebrow}>Versões</p>
              <h2>Histórico</h2>
            </div>
          </div>
          <div className={styles.versionList}>
            {versions.map((item) => (
              <Link
                aria-current={version?.id === item.id ? "page" : undefined}
                className={`${styles.versionLink} ${
                  version?.id === item.id ? styles.versionLinkActive : ""
                }`}
                href={`/admin/${context.company.slug}/treinos/${plan.id}?versionId=${item.id}`}
                key={item.id}
              >
                <strong>Versão {item.version_number}</strong>
                <span>{levelLabels[item.level]}</span>
                <span>{statusLabels[item.status]}</span>
              </Link>
            ))}
          </div>
        </article>

        <article className={styles.panel}>
          <div className={styles.sectionHeadBalanced}>
            <div>
              <p className={styles.eyebrow}>Estado</p>
              <h2>Versão selecionada</h2>
            </div>
          </div>
          {version ? (
            <dl className={styles.trainingPlanMeta}>
              <div>
                <dt>Nível</dt>
                <dd>{levelLabels[version.level]}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>{statusLabels[version.status]}</dd>
              </div>
              <div>
                <dt>Duração</dt>
                <dd>{formatDuration(version.duration_seconds)}</dd>
              </div>
              <div>
                <dt>Publicada</dt>
                <dd>{version.published_at ? "Sim" : "Não"}</dd>
              </div>
            </dl>
          ) : (
            <p className={styles.empty}>Este treino ainda não possui versão.</p>
          )}
        </article>
      </section>

      {version ? (
        <section className={styles.trainingDetailContent}>
          <article className={styles.panel}>
            <div className={styles.sectionHeadBalanced}>
              <div>
                <p className={styles.eyebrow}>Estrutura</p>
                <h2>Blocos do treino</h2>
              </div>
              {canPublish ? (
                <form action={publishTrainingVersionAction}>
                  <input name="slug" type="hidden" value={context.company.slug} />
                  <input name="trainingPlanId" type="hidden" value={plan.id} />
                  <input
                    name="trainingPlanVersionId"
                    type="hidden"
                    value={version.id}
                  />
                  <button className={styles.primaryButton} type="submit">
                    Publicar versão
                  </button>
                </form>
              ) : null}
            </div>

            {parentBlocks.length > 0 ? (
              <div className={styles.trainingTimelineReadOnly}>
                {parentBlocks.map((block) => {
                  const children = getChildBlocks(blocks, block.id);

                  return (
                    <article className={styles.timelineReadOnlyBlock} key={block.id}>
                      <div>
                        <strong>{block.name}</strong>
                        <span>
                          {block.block_kind === "repeat_group"
                            ? `Repetir ${block.repeat_count ?? 2} vezes`
                            : block.block_type
                              ? blockTypeLabels[block.block_type]
                              : "Bloco"}
                        </span>
                      </div>
                      {block.block_kind === "simple" ? (
                        <p>
                          {formatDuration(block.duration_seconds)}
                          {block.bora_zone ? ` · ${zoneLabels[block.bora_zone]}` : ""}
                          {block.instruction ? ` · ${block.instruction}` : ""}
                        </p>
                      ) : null}
                      {children.length > 0 ? (
                        <div className={styles.repeatChildrenReadOnly}>
                          {children.map((child) => (
                            <div key={child.id}>
                              <strong>{child.name}</strong>
                              <p>
                                {formatDuration(child.duration_seconds)}
                                {child.bora_zone
                                  ? ` · ${zoneLabels[child.bora_zone]}`
                                  : ""}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            ) : (
              <p className={styles.empty}>Nenhum bloco salvo nesta versão.</p>
            )}
          </article>

          <article className={styles.panel}>
            <div className={styles.sectionHeadBalanced}>
              <div>
                <p className={styles.eyebrow}>Notas</p>
                <h2>Orientações</h2>
              </div>
            </div>
            <div className={styles.trainingNotesGrid}>
              <div>
                <strong>Técnicas</strong>
                <p>{version.technical_notes || "Sem observações técnicas."}</p>
              </div>
              <div>
                <strong>Segurança</strong>
                <p>{version.safety_notes || "Sem observações de segurança."}</p>
              </div>
            </div>
          </article>

          {plan.status !== "archived" ? (
            <form action={archiveTrainingPlanAction} className={styles.archivePanel}>
              <input name="slug" type="hidden" value={context.company.slug} />
              <input name="trainingPlanId" type="hidden" value={plan.id} />
              <div>
                <strong>Arquivar treino</strong>
                <p>
                  O treino deixa de aparecer como ativo, mas o histórico de versões
                  permanece preservado.
                </p>
              </div>
              <button className={styles.secondaryButton} type="submit">
                Arquivar
              </button>
            </form>
          ) : null}
        </section>
      ) : null}
    </AdminShell>
  );
}
