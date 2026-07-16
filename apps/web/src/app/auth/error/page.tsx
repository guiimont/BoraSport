import { ActionLink, Alert, AuthShell } from "../../../components/ui";

export default function AuthErrorPage() {
  return (
    <AuthShell
      aside={
        <ActionLink href="/login" variant="ghost">
          Voltar para o login
        </ActionLink>
      }
      eyebrow="Acesso BoraSport"
      lead="Não foi possível concluir a autenticação com este link."
      title="Link inválido ou expirado."
    >
      <Alert tone="warning">
        Peça um novo link de recuperação ou entre novamente com e-mail e senha.
      </Alert>
    </AuthShell>
  );
}
