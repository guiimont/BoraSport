import { ActionLink, Alert, AuthShell } from "../../../components/ui";
import { getCurrentUser } from "../../../lib/saas/queries";
import { ResetPasswordForm } from "./reset-password-form";

export default async function ResetPasswordPage() {
  const user = await getCurrentUser();

  return (
    <AuthShell
      aside={
        <ActionLink href="/login" variant="ghost">
          Voltar para o login
        </ActionLink>
      }
      eyebrow="Nova senha"
      lead="Defina uma nova senha para continuar acessando sua rotina no BoraSport."
      title="Crie uma senha segura."
    >
      {user ? (
        <ResetPasswordForm />
      ) : (
        <Alert tone="warning">
          A sessão de redefinição não está ativa. Peça um novo link de
          recuperação de senha.
        </Alert>
      )}
    </AuthShell>
  );
}
