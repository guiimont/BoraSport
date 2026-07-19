import styles from "./admin.module.css";

export default function AdminLoading() {
  return (
    <main className={styles.page}>
      <section className={styles.claimPanel} aria-live="polite">
        <p className={styles.eyebrow}>Painel do gestor</p>
        <h1>Carregando gestão do clube</h1>
        <p className={styles.muted}>
          Buscando agenda, canoas, remadores e permissões.
        </p>
      </section>
    </main>
  );
}
