import { LoginForm } from "./login-form";
import styles from "./login.module.css";

type LoginPageProps = {
  searchParams: Promise<{
    next?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { next } = await searchParams;

  return (
    <main className={styles.page}>
      <section className={styles.panel}>
        <p className={styles.eyebrow}>Acesso Bora</p>
        <h1>Entrar na plataforma</h1>
        <p className={styles.muted}>
          Use seu email para acessar os tenants onde voce e aluno, profissional
          ou administrador.
        </p>

        <LoginForm next={next || "/"} />
      </section>
    </main>
  );
}
