import Link from "next/link";

import styles from "./privacy.module.css";

export const metadata = {
  title: "Política de Privacidade | BoraSport",
  description: "Como o BoraSport trata dados pessoais e dados provenientes da Garmin.",
};

export default function PrivacyPage() {
  return (
    <main className={styles.page}>
      <article className={styles.policy}>
        <header>
          <Link href="/">BoraSport</Link>
          <p>Privacidade e controle do atleta</p>
          <h1>Política de Privacidade</h1>
          <span>Última atualização: 31 de outubro de 2026</span>
        </header>

        <section>
          <h2>1. Sobre esta política</h2>
          <p>
            Esta política explica como o BoraSport coleta, utiliza, armazena e
            protege dados pessoais de atletas, treinadores e gestores de clubes,
            incluindo dados fornecidos por meio do Garmin Connect.
          </p>
        </section>

        <section>
          <h2>2. Dados Garmin utilizados</h2>
          <p>
            Quando o atleta conecta voluntariamente sua conta Garmin, o BoraSport
            pode receber dados de atividades e treinos autorizados pelo próprio
            usuário, como modalidade, data e horário, duração, distância, ritmo,
            velocidade, frequência cardíaca e arquivos de atividade disponíveis.
            Dados de saúde somente serão tratados quando forem necessários à
            experiência escolhida e expressamente autorizados pelo usuário.
          </p>
        </section>

        <section>
          <h2>3. Finalidades</h2>
          <p>Os dados são usados para:</p>
          <ul>
            <li>registrar e apresentar o histórico esportivo individual;</li>
            <li>acompanhar evolução, volume, frequência e desempenho na remada;</li>
            <li>relacionar uma atividade ao treino ou à presença no clube;</li>
            <li>permitir que o atleta controle sua privacidade e compartilhamento;</li>
            <li>enviar treinos estruturados ao dispositivo quando autorizado.</li>
          </ul>
        </section>

        <section>
          <h2>4. Associação ao usuário e visibilidade</h2>
          <p>
            Os dados Garmin são associados à conta identificável do atleta para
            oferecer histórico e evolução individual. Informações de saúde e rotas
            permanecem privadas por padrão. O usuário controla quais informações
            podem ser compartilhadas com seu clube ou treinador.
          </p>
        </section>

        <section>
          <h2>5. Prestadores de serviço</h2>
          <p>
            O BoraSport utiliza a Supabase para autenticação e armazenamento de
            dados e a Vercel para hospedagem e operação da aplicação. Esses
            fornecedores processam dados apenas para prestar seus serviços de
            infraestrutura, sob controles de acesso e segurança. Dados Garmin não
            são vendidos, alugados ou fornecidos para publicidade.
          </p>
        </section>

        <section>
          <h2>6. Inteligência artificial</h2>
          <p>
            Dados provenientes da Garmin não são utilizados para treinar, avaliar
            ou aprimorar modelos de inteligência artificial. Qualquer futura
            funcionalidade de IA que processe esses dados dependerá de informação
            transparente, finalidade específica e consentimento expresso e
            revogável do usuário.
          </p>
        </section>

        <section>
          <h2>7. Retenção, segurança e direitos</h2>
          <p>
            Mantemos os dados somente pelo período necessário às finalidades desta
            política e adotamos medidas técnicas e organizacionais de proteção. O
            usuário pode solicitar acesso, correção, exportação ou exclusão de seus
            dados, além de desconectar a Garmin e retirar seu consentimento a
            qualquer momento na área de perfil.
          </p>
        </section>

        <section>
          <h2>8. Contato</h2>
          <p>
            Para dúvidas ou solicitações relacionadas à privacidade, entre em
            contato pelo e-mail <a href="mailto:smonteiro.guilherme@gmail.com">smonteiro.guilherme@gmail.com</a>.
          </p>
        </section>
      </article>
    </main>
  );
}
