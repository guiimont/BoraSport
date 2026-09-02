import { notFound } from "next/navigation";

import { getManageAdminContext } from "../admin-context";
import { AdminShell } from "../admin-shell";
import styles from "../admin.module.css";

type Props = { params: Promise<{ slug: string }> };

export default async function FinancePage({ params }: Props) {
  const { slug } = await params;
  const context = await getManageAdminContext(slug);
  if (context.company.organization_kind !== "club") notFound();

  return (
    <AdminShell
      active="financeiro"
      context={context}
      eyebrow="Pū · Financeiro & Planos"
      subtitle="A estrutura está no lugar sem inventar cobranças: regras de planos, vencimentos e inadimplência serão ativadas quando forem aprovadas pelo produto."
      title="Gestão financeira"
    >
      <section className={styles.statGrid}>
        <article className={styles.statCard}><p>Receita recorrente</p><strong>—</strong><span className={styles.statHint}>Sem plano financeiro configurado</span></article>
        <article className={styles.statCard}><p>Mensalidades em aberto</p><strong>—</strong><span className={styles.statHint}>Cobranças ainda não ativadas</span></article>
        <article className={styles.statCard}><p>Inadimplência</p><strong>—</strong><span className={styles.statHint}>Nenhum dado financeiro criado</span></article>
      </section>
      <section className={styles.panel}>
        <p className={styles.eyebrow}>Próximo contrato de produto</p>
        <h2>Planos, recorrência e relatórios</h2>
        <p className={styles.muted}>Este destino existe apenas para Pupu Clube. Nenhum recurso financeiro aparece em grupos informais e nenhum valor fictício foi gerado.</p>
      </section>
    </AdminShell>
  );
}
