import Link from "next/link";
import type { ReactNode } from "react";

import { BrandMark } from "./brand-mark";
import styles from "./ui.module.css";

type MemberDestination = "aito" | "amuiraa" | "hoe" | "moana";

type MemberShellCompany = {
  name: string;
  organization_kind?: "club" | "group";
  slug: string;
} | null;

type MemberShellProps = {
  active?: MemberDestination;
  children: ReactNode;
  company?: MemberShellCompany;
  context: string;
  description?: string;
  greetingName?: string | null;
  title: string;
};

const destinations: Array<{
  href: string;
  icon: "community" | "compass" | "paddle" | "profile";
  id: MemberDestination;
  label: string;
  subtitle: string;
}> = [
  { href: "/comunidade", icon: "community", id: "amuiraa", label: "‘Āmuira‘a", subtitle: "Feed & Comunidade" },
  { href: "/remadas", icon: "paddle", id: "hoe", label: "Hoe", subtitle: "Diário & Atividades" },
  { href: "/descobrir", icon: "compass", id: "moana", label: "Moana", subtitle: "Descobrir o Mar" },
  { href: "/perfil", icon: "profile", id: "aito", label: "‘Aito", subtitle: "Atleta & Ajustes" },
];

function NavIcon({ name }: { name: (typeof destinations)[number]["icon"] }) {
  if (name === "community") {
    return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M8 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm8 1a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM2 20c0-3 2.7-5 6-5s6 2 6 5M14 16c.7-.4 1.5-.6 2.4-.6 2.7 0 4.6 1.7 4.6 4.1" /></svg>;
  }
  if (name === "paddle") {
    return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="m18.5 3-3.8 3.8-2.1 5.6-7.4 7.4M16.7 4.8l2.5 2.5M4 20l2.6-.7-1.9-1.9L4 20Z" /></svg>;
  }
  if (name === "compass") {
    return <svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2.2 4.8-4.8 2.2 2.2-4.8 4.8-2.2Z" /></svg>;
  }
  return <svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" /><path d="M4 21c.6-4.2 3.2-6.5 8-6.5s7.4 2.3 8 6.5" /></svg>;
}

export function MemberShell({
  active,
  children,
  company = null,
  context,
  description = "Sua vida no va'a em uma única jornada.",
  greetingName,
  title,
}: MemberShellProps) {
  return (
    <main className={styles.memberPage}>
      <header className={styles.memberHero}>
        <div className={styles.memberHeroBackdrop} aria-hidden>
          <span className={styles.memberStarOne} />
          <span className={styles.memberStarTwo} />
          <span className={styles.memberHorizon} />
        </div>

        <div className={styles.memberTopbar}>
          <Link aria-label="BoraSport" href="/comunidade"><BrandMark /></Link>
          <nav className={styles.memberNav} aria-label="‘Āmuira‘a · Ambiente do remador">
            {destinations.map((destination) => (
              <Link
                aria-current={active === destination.id ? "page" : undefined}
                className={styles.memberNavLink}
                data-active={active === destination.id}
                href={destination.href}
                key={destination.id}
              >
                <NavIcon name={destination.icon} />
                <span><strong>{destination.label}</strong><small>{destination.subtitle}</small></span>
              </Link>
            ))}
          </nav>
          {company ? (
            <Link className={styles.organizationSwitch} href={`/clube/${company.slug}`}>
              <span>Pupu {company.organization_kind === "group" ? "Grupo" : "Clube"}</span>
              <strong>{company.name}</strong>
            </Link>
          ) : null}
        </div>

        <div className={styles.memberHeroContent}>
          {greetingName ? <p className={styles.memberGreeting}>‘Ia Ora Na, {greetingName}! O mar está pronto para a sua remada de hoje.</p> : null}
          <p className={styles.memberEyebrow}>{context}</p>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
      </header>

      <div className={styles.memberContent}>{children}</div>
    </main>
  );
}
