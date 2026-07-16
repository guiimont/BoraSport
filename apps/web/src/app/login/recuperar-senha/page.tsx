import { ActionLink, AuthShell } from "../../../components/ui";
import { RecoveryForm } from "./recovery-form";

export default function PasswordRecoveryPage() {
  return (
    <AuthShell
      aside={
        <ActionLink href="/login" variant="ghost">
          Voltar para o login
        </ActionLink>
      }
      eyebrow="Recuperação de senha"
      lead="Informe seu e-mail para receber um link seguro de redefinição."
      title="Redefina seu acesso."
    >
      <RecoveryForm />
    </AuthShell>
  );
}
