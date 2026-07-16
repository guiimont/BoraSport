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
      lead="Acesse sua agenda, acompanhe os treinos e entre nas áreas do seu clube."
      title="Entre para remar com mais clareza."
    >
      <LoginForm next={next || "/perfil"} />
    </AuthShell>
  );
}
