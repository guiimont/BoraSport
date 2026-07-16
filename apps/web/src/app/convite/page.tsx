import { AuthShell } from "../../components/ui";
import { getCurrentUser } from "../../lib/saas/queries";
import { getStoredInviteContext } from "./actions";
import { InviteFlow } from "./invite-flow";
import styles from "./invite.module.css";

export default async function InvitePage() {
  const [user, context] = await Promise.all([
    getCurrentUser(),
    getStoredInviteContext(),
  ]);

  return (
    <AuthShell
      aside={
        <div className={styles.intro}>
          <p>
            O acesso ao BoraSport é liberado por convite individual do clube.
            Depois de confirmar seu e-mail, sua conta será vinculada ao clube
            correto.
          </p>
          <ul className={styles.statusList}>
            <li>Convite individual e de uso único</li>
            <li>Senha definida somente por você</li>
            <li>Acesso privado ao perfil e à rotina do clube</li>
          </ul>
        </div>
      }
      eyebrow="Convite BoraSport"
      lead="Crie sua conta de remador ou entre com sua conta existente para aceitar o convite do clube."
      title="Entre no clube com segurança."
    >
      <InviteFlow initialContext={context} isAuthenticated={Boolean(user)} />
    </AuthShell>
  );
}
