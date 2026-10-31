import Link from "next/link";
import type { ReactNode } from "react";

import { BrandEmblem, BrandMark, type BrandIconName } from "../../../components/ui";
import type { AdminContext } from "./admin-context";
import styles from "./admin.module.css";

type AdminSection =
  | "atividades"
  | "agenda"
  | "bases"
  | "canoas"
  | "configuracoes"
  | "financeiro"
  | "overview"
  | "remadores"
  | "site"
  | "treinos";

type AdminModule = "agenda" | "atividades" | "gestao" | "inicio" | "operacao" | "pessoas" | "visao";

type AdminShellProps = {
  active: AdminSection;
  children: ReactNode;
  context: AdminContext;
  eyebrow?: string;
  showSessionBar?: boolean;
  subtitle?: string;
  title: string;
};

type AdminModuleItem = {
  id: AdminModule;
  icon: BrandIconName;
  label: string;
  subtitle: string;
  sections: Array<{ id: AdminSection; label: string; hrefSuffix: string }>;
};

const clubModuleItems: AdminModuleItem[] = [
  {
    id: "visao",
    icon: "mahana",
    label: "Visão geral",
    subtitle: "Mahana · o clube hoje",
    sections: [{ hrefSuffix: "", id: "overview", label: "Visão do dia" }],
  },
  {
    id: "agenda",
    icon: "mahana",
    label: "Agenda",
    subtitle: "Sessões, vagas e presença",
    sections: [{ hrefSuffix: "/agenda", id: "agenda", label: "Agenda" }],
  },
  {
    id: "operacao",
    icon: "faatere",
    label: "Operação",
    subtitle: "Fa‘atere · canoas e treinos",
    sections: [
      { hrefSuffix: "/treinos", id: "treinos", label: "Treinos" },
      { hrefSuffix: "/canoas", id: "canoas", label: "Canoas" },
      { hrefSuffix: "/bases", id: "bases", label: "Bases" },
    ],
  },
  {
    id: "pessoas",
    icon: "taata",
    label: "Pessoas",
    subtitle: "Ta‘ata · remadores e equipe",
    sections: [
      { hrefSuffix: "/remadores", id: "remadores", label: "Remadores" },
      { hrefSuffix: "/atividades", id: "atividades", label: "Presenças" },
    ],
  },
  {
    id: "gestao",
    icon: "pu",
    label: "Gestão",
    subtitle: "Configuração do clube",
    sections: [
      { hrefSuffix: "/site", id: "site", label: "Página pública" },
      { hrefSuffix: "/configuracoes", id: "configuracoes", label: "Configurações" },
      { hrefSuffix: "/financeiro", id: "financeiro", label: "Financeiro" },
    ],
  },
];

const groupModuleItems: AdminModuleItem[] = [
  { id: "inicio", icon: "amuiraa", label: "Visão geral", subtitle: "O grupo hoje", sections: [{ hrefSuffix: "", id: "overview", label: "Início" }] },
  { id: "agenda", icon: "mahana", label: "Agenda", subtitle: "Sessões publicadas", sections: [{ hrefSuffix: "/agenda", id: "agenda", label: "Agenda" }] },
  { id: "pessoas", icon: "taata", label: "Pessoas", subtitle: "Membros do grupo", sections: [{ hrefSuffix: "/remadores", id: "remadores", label: "Pessoas" }] },
  { id: "atividades", icon: "hoe", label: "Atividades", subtitle: "Remadas do grupo", sections: [{ hrefSuffix: "/atividades", id: "atividades", label: "Atividades" }] },
];

export function AdminShell({
  active,
  children,
  context,
  eyebrow = "Gestão do clube",
  showSessionBar = true,
  subtitle,
  title,
}: AdminShellProps) {
  const { company, profileAvatarUrl, role, userLabel } = context;
  const baseHref = `/admin/${company.slug}`;
  const moduleItems = company.organization_kind === "group" ? groupModuleItems : clubModuleItems;
  const activeModule =
    moduleItems.find((module) => module.sections.some((section) => section.id === active)) ??
    moduleItems[0];
  const activeLabel = activeModule.label;
  const profileInitial =
    userLabel.trim().charAt(0).toLocaleUpperCase("pt-BR") || "P";

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <aside className={styles.sidebar}>
          <div className={styles.sidebarTop}>
            <Link className={styles.brandLink} href="/">
              <BrandMark tone="light" variant="monochromeLight" />
            </Link>
            <div className={styles.clubIdentity}>
              <span>Contexto atual · {company.organization_kind === "group" ? "Grupo" : "Clube"}</span>
              <strong>{company.name}</strong>
              <small>{role || "Gestão"} · trocar contexto pelo perfil</small>
            </div>
          </div>

          <nav className={styles.sidebarNav} aria-label="Módulos do gestor">
            {moduleItems.map((item) => (
              <Link
                aria-current={activeModule.id === item.id ? "page" : undefined}
                className={`${styles.navLink} ${
                  activeModule.id === item.id ? styles.navLinkActive : ""
                }`}
                href={`${baseHref}${item.sections[0].hrefSuffix}`}
                key={item.id}
              >
                <span className={styles.navGlyph} aria-hidden><BrandEmblem name={item.icon} /></span>
                <span className={styles.navText}><strong>{item.label}</strong><small>{item.subtitle}</small></span>
              </Link>
            ))}
          </nav>
        </aside>

        <section className={styles.mainColumn}>
          <header className={styles.topbar}>
            <div className={styles.mobileTopbar}>
              <Link
                aria-label="Início do BoraSport"
                className={styles.mobileBrand}
                href="/"
              >
                <BrandMark
                  iconOnly
                  label="BoraSport"
                  tone="light"
                  variant="monochromeLight"
                />
              </Link>
              <div className={styles.mobileClubIdentity}>
                <span>Pupu {company.organization_kind === "group" ? "Grupo" : "Clube"}</span>
                <strong>{company.name}</strong>
              </div>
              <div className={styles.mobileTopbarActions}>
                <Link
                  aria-label="Abrir página pública do clube"
                  className={styles.mobileIconButton}
                  href={`/clube/${company.slug}`}
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24">
                    <path d="M14 5h5v5M19 5l-8 8M18 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
                  </svg>
                </Link>
                <Link
                  aria-label="Abrir meu perfil"
                  className={styles.mobileProfileButton}
                  href="/perfil"
                >
                  {profileAvatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img alt="" src={profileAvatarUrl} />
                  ) : (
                    profileInitial
                  )}
                </Link>
              </div>
            </div>

            <div className={styles.topbarText}>
              <p className={styles.eyebrow}>{eyebrow}</p>
              <h1>{title}</h1>
              {subtitle ? <p className={styles.headerText}>{subtitle}</p> : null}
              {showSessionBar ? (
                <div className={styles.sessionBar}>
                  <span>{userLabel}</span>
                  <span>Perfil: {role || "sem vínculo"}</span>
                  <span>{company.type_de_negocio || "va'a"}</span>
                </div>
              ) : null}
            </div>

            <div className={styles.topbarActions}>
              <Link
                className={styles.secondaryButton}
                href={`/clube/${company.slug}`}
              >
                Página pública
              </Link>
              <Link className={styles.primaryButtonLink} href="/perfil">
                Meu perfil
              </Link>
            </div>
          </header>

          <details className={styles.mobileNav}>
            <summary>
              <span>
                <small>Você está em</small>
                <strong>{activeLabel}</strong>
              </span>
              <span className={styles.mobileMenuLabel}>Menu</span>
            </summary>
            <nav
              className={styles.mobileNavLinks}
              aria-label="Módulos do gestor"
            >
              {moduleItems.map((item) => (
                <Link
                  aria-current={activeModule.id === item.id ? "page" : undefined}
                  className={`${styles.navPill} ${
                    activeModule.id === item.id ? styles.navPillActive : ""
                  }`}
                  href={`${baseHref}${item.sections[0].hrefSuffix}`}
                  key={item.id}
                >
                <span><strong>{item.label}</strong><small>{item.subtitle}</small></span>
                </Link>
              ))}
            </nav>
          </details>

          {activeModule.sections.length > 1 ? (
            <nav className={styles.sectionNav} aria-label={`Áreas de ${activeModule.label}`}>
              {activeModule.sections.map((section) => (
                <Link
                  aria-current={active === section.id ? "page" : undefined}
                  className={`${styles.navPill} ${
                    active === section.id ? styles.navPillActive : ""
                  }`}
                  href={`${baseHref}${section.hrefSuffix}`}
                  key={section.id}
                >
                  {section.label}
                </Link>
              ))}
            </nav>
          ) : null}

          <div className={styles.content}>{children}</div>
        </section>
      </div>
    </main>
  );
}
