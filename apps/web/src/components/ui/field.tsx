import type { ReactNode } from "react";

import styles from "./ui.module.css";

type FieldProps = {
  children: ReactNode;
  error?: string;
  help?: string;
  label: string;
};

export function Field({ children, error, help, label }: FieldProps) {
  return (
    <label className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      {children}
      {help ? <span className={styles.fieldHelp}>{help}</span> : null}
      {error ? (
        <span className={styles.fieldError} role="alert">
          {error}
        </span>
      ) : null}
    </label>
  );
}
