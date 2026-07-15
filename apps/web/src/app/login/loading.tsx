import { AuthShell, Spinner } from "../../components/ui";
import styles from "./login.module.css";

export default function LoginLoading() {
  return (
    <AuthShell
      eyebrow="Acesso BoraSport"
      lead="Preparando o acesso seguro para a plataforma."
      title="Entrando no ritmo do clube."
    >
      <div className={styles.loadingState}>
        <Spinner label="Carregando acesso" />
      </div>
    </AuthShell>
  );
}
