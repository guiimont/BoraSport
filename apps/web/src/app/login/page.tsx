import { LoginForm } from "./login-form";
import { AuthShell } from "../../components/ui";

type LoginPageProps = {
  searchParams: Promise<{
    next?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { next } = await searchParams;

  return (
    <AuthShell
      eyebrow="Acesso BoraSport"
      lead="Entre com seu e-mail para acessar sua rotina no clube, acompanhar remadas e seguir para as áreas liberadas para sua conta."
      title="Entre para remar com mais clareza."
    >
      <LoginForm next={next || "/"} />
    </AuthShell>
  );
}
