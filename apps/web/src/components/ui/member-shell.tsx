import type { ReactNode } from "react";

import { ActionLink } from "./button";
import { BrandMark } from "./brand-mark";
import styles from "./ui.module.css";

type MemberShellCompany = {
  name: string;
  slug: string;
} | null;

type MemberShellProps = {
  children: ReactNode;
  company?: MemberShellCompany;
  context: string;
  title: string;
  userEmail?: string | null;
  userName?: string | null;
};

export function MemberShell({
  children,
  company = null,
  context,
  title,
  userEmail,
  userName,
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
          <BrandMark />
          <nav className={styles.memberNav} aria-label="Navegação do remador">
            <ActionLink href="/" variant="ghost">
              Início
            </ActionLink>
            {company ? (
              <ActionLink href={`/clube/${company.slug}`} variant="secondary">
                Meu clube
              </ActionLink>
            ) : null}
          </nav>
        </div>

        <div className={styles.memberHeroContent}>
          <div>
            <p className={styles.memberEyebrow}>{context}</p>
            <h1>{title}</h1>
            <p>
              Mantenha seus dados atualizados para aparecer corretamente nas
              reservas e na rotina do clube.
            </p>
          </div>

          <aside className={styles.memberIdentity} aria-label="Usuário conectado">
            <span>Conta conectada</span>
            <strong>{userName || userEmail || "Remador BoraSport"}</strong>
            {userEmail ? <small>{userEmail}</small> : null}
            {company ? <em>{company.name}</em> : null}
          </aside>
        </div>
      </header>

      <div className={styles.memberContent}>{children}</div>
    </main>
  );
}
