import type { Metadata } from "next";
import Link from "next/link";

import { CommercialLeadForm } from "./commercial-lead-form";
import styles from "./home.module.css";

export const metadata: Metadata = {
  title: "BoraSport | Gestão completa para clubes de va'a",
  description:
    "Agenda, reservas, canoas, treinos, remadores e comunicação em uma plataforma criada para clubes de va'a.",
};

const problemItems = [
  "Reservas espalhadas em grupos",
  "Alterações de última hora",
  "Dificuldade para organizar canoas e vagas",
  "Informações dos remadores fragmentadas",
  "Comunicação descentralizada",
  "Falta de visão da operação",
];

const resources = [
  {
    title: "Agenda e reservas",
    items: [
      "Horários organizados",
      "Vagas disponíveis",
      "Confirmações",
      "Cancelamentos",
      "Controle de vagas",
    ],
  },
  {
    title: "Gestão de canoas",
    items: [
      "Organização das canoas",
      "Capacidade",
      "Disponibilidade",
      "Distribuição dos remadores",
      "Controle operacional",
    ],
  },
  {
    title: "Treinos e presença",
    items: [
      "Planejamento",
      "Participantes",
      "Presença",
      "Histórico",
      "Observações do treinador",
    ],
  },
  {
    title: "Gestão de remadores",
    items: [
      "Cadastro",
      "Perfil",
      "Experiência",
      "Frequência",
      "Histórico esportivo",
    ],
  },
  {
    title: "Comunicação do clube",
    items: [
      "Informações centralizadas",
      "Avisos",
      "Alterações",
      "Eventos",
      "Relacionamento com a comunidade",
    ],
  },
  {
    title: "Presença digital",
    items: [
      "Página do clube",
      "Informações",
      "Horários",
      "Captação",
      "Identidade visual",
    ],
  },
];

const profiles = [
  {
    label: "Para o remador",
    text: "Reserve seus treinos, acompanhe sua rotina e permaneça conectado ao clube.",
  },
  {
    label: "Para o treinador",
    text: "Organize canoas, participantes, presença e planejamento em um único lugar.",
  },
  {
    label: "Para o gestor",
    text: "Tenha visão da operação, das pessoas e da rotina do clube sem depender de planilhas.",
  },
];

const steps = [
  {
    title: "Configure seu clube",
    text: "Defina identidade, canoas, horários e informações essenciais da operação.",
  },
  {
    title: "Organize a operação",
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
        <Link aria-label="BoraSport início" className={styles.brand} href="/">
          <span aria-hidden="true">B</span>
          BoraSport
        </Link>

        <nav aria-label="Navegação principal" className={styles.nav}>
          <a href="#visao">Visão geral</a>
          <a href="#recursos">Recursos</a>
          <a href="#clube">Para o clube</a>
          <a href="#como-funciona">Como funciona</a>
          <a href="#contato">Contato</a>
        </nav>

        <div className={styles.headerActions}>
          <Link className={styles.headerLogin} href="/login">
            Entrar
          </Link>
          <a className={styles.headerCta} href="#contato">
            Solicitar demonstração
          </a>
        </div>
      </header>

      <section className={styles.hero} id="visao">
        <div className={styles.heroBackdrop} aria-hidden="true">
          <span className={styles.starOne} />
          <span className={styles.starTwo} />
          <span className={styles.routeLine} />
          <span className={styles.horizon} />
        </div>

        <div className={styles.heroContent}>
          <p className={styles.eyebrow}>Gestão especializada em va'a</p>
          <h1>Seu clube organizado. Suas canoas na água. Sua comunidade mais forte.</h1>
          <p className={styles.heroLead}>
            O BoraSport reúne agenda, reservas, canoas, treinos, remadores e
            comunicação em uma plataforma criada para a realidade do va'a.
          </p>

          <div className={styles.actions}>
            <a className={styles.primaryButton} href="#contato">
              Solicitar demonstração
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
            <span>Próximo treino</span>
            <strong>05:45</strong>
            <p>Treino técnico - V6 Hoku</p>
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
          <p className={styles.eyebrow}>Operação real</p>
          <h2>Menos planilhas. Menos mensagens perdidas. Mais tempo no mar.</h2>
          <p>
            Clubes de va'a precisam lidar com rotina, pessoas, canoas e
            comunicação em movimento. O BoraSport organiza essa base em uma
            experiência simples para quem opera e para quem rema.
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
            Uma base profissional para estruturar a operação, melhorar a
            experiência dos remadores e apoiar a gestão do va'a.
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
          <p className={styles.eyebrow}>Experiência por perfil</p>
          <h2>Cada pessoa vê o que precisa para agir.</h2>
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
          <h2>Da configuração à comunidade em uma jornada clara.</h2>
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
          <h2>Não adaptamos uma ferramenta genérica. Criamos uma plataforma para o va'a.</h2>
        </div>
        <p>
          A linguagem, a operação e a experiência foram pensadas para clubes de
          va'a: canoas, remadores, treinos, mar, comunicação e uma comunidade que
          precisa remar na mesma direção.
        </p>
      </section>

      <section className={styles.contactSection} id="contato">
        <div className={styles.contactCopy}>
          <p className={styles.eyebrow}>Contato</p>
          <h2>Leve o BoraSport para o seu clube</h2>
          <p>
            Preencha seus dados para conhecer a plataforma e conversar sobre a
            operação do seu clube.
          </p>
          <div className={styles.finalCallout}>
            Seu clube nasceu do mar. A gestão dele também pode evoluir.
          </div>
        </div>

        <CommercialLeadForm />
      </section>

      <footer className={styles.footer}>
        <div>
          <strong>BoraSport</strong>
          <p>Plataforma especializada em va'a.</p>
        </div>
        <nav aria-label="Links do rodapé">
          <a href="#visao">Visão geral</a>
          <a href="#recursos">Recursos</a>
          <a href="#clube">Para o clube</a>
          <a href="#contato">Contato</a>
        </nav>
      </footer>
    </main>
  );
}
