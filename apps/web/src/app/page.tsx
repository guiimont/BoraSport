import Link from "next/link";
import TenantAccessForm from "./tenant-access-form";
import styles from "./home.module.css";

export default function HomePage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div>
          <p className={styles.kicker}>Bora</p>
          <h1>Agenda multi-tenant para atividades com turma, recurso e instrutor.</h1>
          <p className={styles.subtitle}>
            Uma base para clubes, boxes, studios e centros esportivos. O vocabulário,
            os recursos e os serviços mudam conforme cada operação.
          </p>
        </div>
      </section>

      <section className={styles.roleGrid} aria-label="Escolha sua area">
        <article className={styles.roleCard}>
          <div className={styles.roleHeader}>
            <span className={styles.roleBadge}>Aluno</span>
            <h2>Quero agendar ou acompanhar meus treinos</h2>
          </div>
          <p>
            Entre pela página pública do clube para ver horários, vagas,
            participantes confirmados e condições específicas da atividade.
          </p>
          <TenantAccessForm mode="public" />
          <Link className={styles.secondaryLink} href="/perfil">
            Ir para meu perfil
          </Link>
        </article>

        <article className={styles.roleCard}>
          <div className={styles.roleHeader}>
            <span className={styles.roleBadge}>Gestor</span>
            <h2>Sou dono, admin ou profissional do espaço</h2>
          </div>
          <p>
            Configure a empresa, personalize termos, cadastre recursos,
            serviços, horários e gerencie a agenda do tenant.
          </p>
          <TenantAccessForm mode="admin" />
          <Link className={styles.secondaryLink} href="/login">
            Entrar na conta de gestão
          </Link>
        </article>
      </section>
    </main>
  );
}
