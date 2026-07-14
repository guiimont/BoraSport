import type { Metadata } from "next";
import Link from "next/link";

import { CommercialLeadForm } from "./commercial-lead-form";
import styles from "./home.module.css";

export const metadata: Metadata = {
  title: "BoraSport | Gestao completa para clubes de va'a",
  description:
    "Agenda, reservas, canoas, treinos, remadores e comunicacao em uma plataforma criada para clubes de va'a.",
};

const problemItems = [
  "Reservas espalhadas em grupos",
  "Alteracoes de ultima hora",
  "Dificuldade para organizar canoas e vagas",
  "Informacoes dos remadores fragmentadas",
  "Comunicacao descentralizada",
  "Falta de visao da operacao",
];

const resources = [
  {
    title: "Agenda e reservas",
    items: [
      "Horarios organizados",
      "Vagas disponiveis",
      "Confirmacoes",
      "Cancelamentos",
      "Controle de vagas",
    ],
  },
  {
    title: "Gestao de canoas",
    items: [
      "Organizacao das canoas",
      "Capacidade",
      "Disponibilidade",
      "Distribuicao dos remadores",
      "Controle operacional",
    ],
  },
  {
    title: "Treinos e presenca",
    items: [
      "Planejamento",
      "Participantes",
      "Presenca",
      "Historico",
      "Observacoes do treinador",
    ],
  },
  {
    title: "Gestao de remadores",
    items: [
      "Cadastro",
      "Perfil",
      "Experiencia",
      "Frequencia",
      "Historico esportivo",
    ],
  },
  {
    title: "Comunicacao do clube",
    items: [
      "Informacoes centralizadas",
      "Avisos",
      "Alteracoes",
      "Eventos",
      "Relacionamento com a comunidade",
    ],
  },
  {
    title: "Presenca digital",
    items: [
      "Pagina do clube",
      "Informacoes",
      "Horarios",
      "Captacao",
      "Identidade visual",
    ],
  },
];

const profiles = [
  {
    label: "Para o remador",
    text: "Reserve seus treinos, acompanhe sua rotina e permaneca conectado ao clube.",
  },
  {
    label: "Para o treinador",
    text: "Organize canoas, participantes, presenca e planejamento em um unico lugar.",
  },
  {
    label: "Para o gestor",
    text: "Tenha visao da operacao, das pessoas e da rotina do clube sem depender de planilhas.",
  },
];

const steps = [
  {
    title: "Configure seu clube",
    text: "Defina identidade, canoas, horarios e informacoes essenciais da operacao.",
  },
  {
    title: "Organize a operacao",
    text: "Publique treinos, acompanhe vagas e mantenha reservas em uma rotina clara.",
  },
  {
    title: "Conecte sua comunidade",
    text: "Centralize avisos, participantes e presenca digital em torno do clube.",
  },
];

export default function HomePage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link aria-label="BoraSport inicio" className={styles.brand} href="/">
          <span aria-hidden="true">B</span>
          BoraSport
        </Link>

        <nav aria-label="Navegacao principal" className={styles.nav}>
          <a href="#visao">Visao geral</a>
          <a href="#recursos">Recursos</a>
          <a href="#clube">Para o clube</a>
          <a href="#como-funciona">Como funciona</a>
          <a href="#contato">Contato</a>
        </nav>

        <a className={styles.headerCta} href="#contato">
          Solicitar demonstracao
        </a>
      </header>

      <section className={styles.hero} id="visao">
        <div className={styles.heroBackdrop} aria-hidden="true">
          <span className={styles.starOne} />
          <span className={styles.starTwo} />
          <span className={styles.routeLine} />
          <span className={styles.horizon} />
        </div>

        <div className={styles.heroContent}>
          <p className={styles.eyebrow}>Gestao especializada em va'a</p>
          <h1>Seu clube organizado. Suas canoas na agua. Sua comunidade mais forte.</h1>
          <p className={styles.heroLead}>
            O BoraSport reune agenda, reservas, canoas, treinos, remadores e
            comunicacao em uma plataforma criada para a realidade do va'a.
          </p>

          <div className={styles.actions}>
            <a className={styles.primaryButton} href="#contato">
              Solicitar demonstracao
            </a>
            <a className={styles.secondaryButton} href="#recursos">
              Conhecer a plataforma
            </a>
          </div>
        </div>

        <div className={styles.productScene} aria-label="Exemplo visual da plataforma">
          <div className={styles.sceneTopline}>
            <span>Clube Oceano</span>
            <strong>Hoje</strong>
          </div>
          <div className={styles.nextTraining}>
            <span>Proximo treino</span>
            <strong>05:45</strong>
            <p>Treino tecnico - V6 Hoku</p>
          </div>
          <div className={styles.sceneGrid}>
            <div>
              <span>Vagas</span>
              <strong>4/6</strong>
            </div>
            <div>
              <span>Canoa</span>
              <strong>V6</strong>
            </div>
            <div>
              <span>Local</span>
              <strong>Base</strong>
            </div>
          </div>
          <div className={styles.participants}>
            <span>Participantes confirmados</span>
            <div>
              <i>MA</i>
              <i>RL</i>
              <i>CS</i>
              <i>+1</i>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.problemSection}>
        <div className={styles.sectionHeader}>
          <p className={styles.eyebrow}>Operacao real</p>
          <h2>Menos planilhas. Menos mensagens perdidas. Mais tempo no mar.</h2>
          <p>
            Clubes de va'a precisam lidar com rotina, pessoas, canoas e
            comunicacao em movimento. O BoraSport organiza essa base em uma
            experiencia simples para quem opera e para quem rema.
          </p>
        </div>

        <div className={styles.problemGrid}>
          {problemItems.map((item) => (
            <div className={styles.problemItem} key={item}>
              <span aria-hidden="true" />
              {item}
            </div>
          ))}
        </div>
      </section>

      <section className={styles.resourcesSection} id="recursos">
        <div className={styles.sectionHeader}>
          <p className={styles.eyebrow}>Plataforma</p>
          <h2>Recursos para organizar a rotina do clube.</h2>
          <p>
            Uma base profissional para estruturar a operacao, melhorar a
            experiencia dos remadores e apoiar a gestao do va'a.
          </p>
        </div>

        <div className={styles.resourceGrid}>
          {resources.map((resource) => (
            <article className={styles.resourceCard} key={resource.title}>
              <h3>{resource.title}</h3>
              <ul>
                {resource.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.profileSection} id="clube">
        <div className={styles.sectionHeader}>
          <p className={styles.eyebrow}>Experiencia por perfil</p>
          <h2>Cada pessoa ve o que precisa para agir.</h2>
        </div>

        <div className={styles.profileGrid}>
          {profiles.map((profile) => (
            <article className={styles.profileCard} key={profile.label}>
              <span>{profile.label}</span>
              <p>{profile.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.stepsSection} id="como-funciona">
        <div className={styles.sectionHeader}>
          <p className={styles.eyebrow}>Como funciona</p>
          <h2>Da configuracao a comunidade em uma jornada clara.</h2>
        </div>

        <div className={styles.stepsGrid}>
          {steps.map((step, index) => (
            <article className={styles.stepCard} key={step.title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.differenceSection}>
        <div>
          <p className={styles.eyebrow}>Diferencial</p>
          <h2>Nao adaptamos uma ferramenta generica. Criamos uma plataforma para o va'a.</h2>
        </div>
        <p>
          A linguagem, a operacao e a experiencia foram pensadas para clubes de
          va'a: canoas, remadores, treinos, mar, comunicacao e uma comunidade que
          precisa remar na mesma direcao.
        </p>
      </section>

      <section className={styles.contactSection} id="contato">
        <div className={styles.contactCopy}>
          <p className={styles.eyebrow}>Contato</p>
          <h2>Leve o BoraSport para o seu clube</h2>
          <p>
            Preencha seus dados para conhecer a plataforma e conversar sobre a
            operacao do seu clube.
          </p>
          <div className={styles.finalCallout}>
            Seu clube nasceu do mar. A gestao dele tambem pode evoluir.
          </div>
        </div>

        <CommercialLeadForm />
      </section>

      <footer className={styles.footer}>
        <div>
          <strong>BoraSport</strong>
          <p>Plataforma especializada em va'a.</p>
        </div>
        <nav aria-label="Links do rodape">
          <a href="#visao">Visao geral</a>
          <a href="#recursos">Recursos</a>
          <a href="#clube">Para o clube</a>
          <a href="#contato">Contato</a>
        </nav>
      </footer>
    </main>
  );
}
