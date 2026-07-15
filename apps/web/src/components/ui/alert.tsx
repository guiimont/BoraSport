import type { ReactNode } from "react";

import styles from "./ui.module.css";

type AlertTone = "success" | "error" | "info" | "warning";

type AlertProps = {
  children: ReactNode;
  tone?: AlertTone;
};

export function Alert({ children, tone = "info" }: AlertProps) {
  return (
    <p
      className={`${styles.alert} ${styles[`alert${tone}`]}`}
      role={tone === "error" ? "alert" : "status"}
    >
      {children}
    </p>
  );
}
