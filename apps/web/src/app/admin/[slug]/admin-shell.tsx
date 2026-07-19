import Link from "next/link";
import type { ReactNode } from "react";

import { BrandMark } from "../../../components/ui";
import type { AdminContext } from "./admin-context";
import styles from "./admin.module.css";

type AdminSection =
  | "agenda"
  | "canoas"
  | "configuracoes"
  | "overview"
  | "remadores"
  | "site"
  | "treinos";

type AdminShellProps = {
  active: AdminSection;
  children: ReactNode;
  context: AdminContext;
  eyebrow?: string;
  subtitle?: string;
  title: string;
};

const navItems: Array<{
  id: AdminSection;
  label: string;
  hrefSuffix: string;
}> = [
  { hrefSuffix: "", id: "overview", label: "Visão geral" },
  { hrefSuffix: "/agenda", id: "agenda", label: "Agenda" },
  { hrefSuffix: "/remadores", id: "remadores", label: "Remadores" },
  { hrefSuffix: "/canoas", id: "canoas", label: "Canoas" },
  { hrefSuffix: "/treinos", id: "treinos", label: "Treinos" },
  { hrefSuffix: "/site", id: "site", label: "Site" },
  { hrefSuffix: "/configuracoes", id: "configuracoes", label: "Configurações" },
];

export function AdminShell({
  active,
  children,
  context,
  eyebrow = "Painel do gestor",
  subtitle,
  title,
}: AdminShellProps) {
  const { company, role, userLabel } = context;
  const baseHref = `/admin/${company.slug}`;

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <aside className={styles.sidebar}>
          <div className={styles.sidebarTop}>
            <Link className={styles.brandLink} href="/">
              <BrandMark tone="light" variant="monochromeLight" />
            </Link>
            <div className={styles.clubIdentity}>
              <span>Clube</span>
              <strong>{company.name}</strong>
            </div>
          </div>

          <nav className={styles.sidebarNav} aria-label="Módulos do gestor">
            {navItems.map((item) => (
              <Link
                aria-current={active === item.id ? "page" : undefined}
                className={`${styles.navLink} ${
                  active === item.id ? styles.navLinkActive : ""
                }`}
                href={`${baseHref}${item.hrefSuffix}`}
                key={item.id}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        <section className={styles.mainColumn}>
          <header className={styles.topbar}>
            <div className={styles.topbarText}>
              <p className={styles.eyebrow}>{eyebrow}</p>
              <h1>{title}</h1>
              {subtitle ? <p className={styles.headerText}>{subtitle}</p> : null}
              <div className={styles.sessionBar}>
                <span>{userLabel}</span>
                <span>Perfil: {role || "sem vínculo"}</span>
                <span>{company.type_de_negocio || "va'a"}</span>
              </div>
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

          <nav className={styles.mobileNav} aria-label="Módulos do gestor">
            {navItems.map((item) => (
              <Link
                aria-current={active === item.id ? "page" : undefined}
                className={`${styles.navPill} ${
                  active === item.id ? styles.navPillActive : ""
                }`}
                href={`${baseHref}${item.hrefSuffix}`}
                key={item.id}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className={styles.content}>{children}</div>
        </section>
      </div>
    </main>
  );
}
