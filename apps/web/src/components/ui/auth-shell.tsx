import type { ReactNode } from "react";

import { ActionLink } from "./button";
import { BrandMark } from "./brand-mark";
import styles from "./ui.module.css";

type AuthShellProps = {
  aside?: ReactNode;
  children: ReactNode;
  eyebrow?: string;
  lead: string;
  title: string;
};

export function AuthShell({
  aside,
  children,
  eyebrow = "Acesso BoraSport",
  lead,
  title,
}: AuthShellProps) {
  return (
    <main className={styles.authPage}>
      <div className={styles.authBackdrop} aria-hidden>
        <span className={styles.authStarOne} />
        <span className={styles.authStarTwo} />
        <span className={styles.authRoute} />
        <span className={styles.authHorizon} />
      </div>

      <section className={styles.authShell} aria-label="Acesso ao BoraSport">
        <div className={styles.authCopy}>
          <BrandMark />
          <p className={styles.authEyebrow}>{eyebrow}</p>
          <h1>{title}</h1>
          <p>{lead}</p>
          <ActionLink href="/" variant="ghost">
            Voltar para a página inicial
          </ActionLink>
          {aside}
        </div>

        <div className={styles.authPanel}>{children}</div>
      </section>
    </main>
  );
}
