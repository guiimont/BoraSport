import Link from "next/link";
import type { ReactNode } from "react";

import { BrandMark } from "./brand-mark";
import { AncestralDivider, BrandEmblem, type BrandIconName } from "./brand-system";
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
  icon: BrandIconName;
  id: MemberDestination;
  label: string;
  subtitle: string;
}> = [
  { href: "/comunidade", icon: "amuiraa", id: "amuiraa", label: "‘Āmuira‘a", subtitle: "Feed & Comunidade" },
  { href: "/remadas", icon: "hoe", id: "hoe", label: "Hoe", subtitle: "Diário & Atividades" },
  { href: "/descobrir", icon: "moana", id: "moana", label: "Moana", subtitle: "Descobrir o Mar" },
  { href: "/perfil", icon: "aito", id: "aito", label: "‘Aito", subtitle: "Atleta & Ajustes" },
];

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
                <BrandEmblem name={destination.icon} />
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

      <div className={styles.memberContent}>
        <AncestralDivider variant={active === "hoe" ? "lashings" : active === "moana" ? "swells" : "niho"} />
        {children}
      </div>
    </main>
  );
}
