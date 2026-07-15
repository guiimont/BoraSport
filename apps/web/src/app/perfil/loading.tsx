import { MemberShell, Spinner } from "../../components/ui";
import styles from "./profile.module.css";

export default function ProfileLoading() {
  return (
    <MemberShell
      context="Perfil do remador"
      title="Meu perfil"
    >
      <section className={styles.profilePanel} aria-label="Carregando perfil">
        <Spinner label="Carregando perfil" />
      </section>
    </MemberShell>
  );
}
