import Link from "next/link";

import { getManageAdminContext } from "../../admin-context";
import { AdminShell } from "../../admin-shell";
import styles from "../../admin.module.css";
import { TrainingBuilderForm } from "../training-builder-form";

type NewTrainingPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function NewTrainingPage({ params }: NewTrainingPageProps) {
  const { slug } = await params;
  const context = await getManageAdminContext(slug);

  return (
    <AdminShell
      active="treinos"
      context={context}
      eyebrow="Novo treino"
      showSessionBar={false}
      subtitle="Crie uma prescrição estruturada por blocos, zonas e versões."
      title="Construtor de treinos"
    >
      <div className={styles.backRow}>
        <Link
          className={styles.secondaryButton}
          href={`/admin/${context.company.slug}/treinos`}
        >
          Voltar para biblioteca
        </Link>
      </div>
      <TrainingBuilderForm slug={context.company.slug} />
    </AdminShell>
  );
}
