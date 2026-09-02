import Link from "next/link";
import type { ReactNode } from "react";

import { BrandIcon, BrandMark, type BrandIconName } from "../../../components/ui";
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

type AdminModule = "agenda" | "atividades" | "faatere" | "inicio" | "mahana" | "pessoas" | "pu" | "taata";

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
    id: "mahana",
    icon: "mahana",
    label: "Mahana",
    subtitle: "Agenda Imediata",
    sections: [
      { hrefSuffix: "", id: "overview", label: "Visão do dia" },
      { hrefSuffix: "/agenda", id: "agenda", label: "Agenda" },
    ],
  },
  {
    id: "faatere",
    icon: "faatere",
    label: "Fa‘atere",
    subtitle: "Canoas & Treinos",
    sections: [
      { hrefSuffix: "/treinos", id: "treinos", label: "Treinos" },
      { hrefSuffix: "/canoas", id: "canoas", label: "Canoas" },
      { hrefSuffix: "/bases", id: "bases", label: "Bases" },
    ],
  },
  {
    id: "taata",
    icon: "taata",
    label: "Ta‘ata",
    subtitle: "Remadores & Equipe",
    sections: [
      { hrefSuffix: "/remadores", id: "remadores", label: "Remadores" },
      { hrefSuffix: "/atividades", id: "atividades", label: "Presenças" },
    ],
  },
  {
    id: "pu",
    icon: "pu",
    label: "Pū",
    subtitle: "Financeiro & Planos",
    sections: [
      { hrefSuffix: "/financeiro", id: "financeiro", label: "Financeiro" },
      { hrefSuffix: "/configuracoes", id: "configuracoes", label: "Configurações" },
      { hrefSuffix: "/site", id: "site", label: "Site público" },
    ],
  },
];

const groupModuleItems: AdminModuleItem[] = [
  { id: "inicio", icon: "amuiraa", label: "Início", subtitle: "Visão do Grupo", sections: [{ hrefSuffix: "", id: "overview", label: "Início" }] },
  { id: "agenda", icon: "mahana", label: "Agenda", subtitle: "Sessões Publicadas", sections: [{ hrefSuffix: "/agenda", id: "agenda", label: "Agenda" }] },
  { id: "pessoas", icon: "taata", label: "Pessoas", subtitle: "Membros do Grupo", sections: [{ hrefSuffix: "/remadores", id: "remadores", label: "Pessoas" }] },
  { id: "atividades", icon: "hoe", label: "Atividades", subtitle: "Remadas do Grupo", sections: [{ hrefSuffix: "/atividades", id: "atividades", label: "Atividades" }] },
];

export function AdminShell({
  active,
  children,
  context,
  eyebrow = "Painel do gestor",
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
              <span>Pupu {company.organization_kind === "group" ? "Grupo" : "Clube"}</span>
              <strong>{company.name}</strong>
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
                <span className={styles.navGlyph} aria-hidden><BrandIcon name={item.icon} /></span>
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
