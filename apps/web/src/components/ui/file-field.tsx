"use client";

import { useId, useState, type InputHTMLAttributes } from "react";

import styles from "./ui.module.css";

type FileFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  actionLabel?: string;
  emptyLabel?: string;
  label: string;
};

export function FileField({
  actionLabel = "Selecionar arquivo",
  className,
  emptyLabel = "Nenhum arquivo selecionado",
  id,
  label,
  onChange,
  ...props
}: FileFieldProps) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const [fileName, setFileName] = useState(emptyLabel);

  return (
    <div className={`${styles.fileField} ${className || ""}`}>
      <span className={styles.fileLabel}>{label}</span>
      <label className={styles.fileControl} htmlFor={inputId}>
        <input
          {...props}
          className={styles.fileInput}
          id={inputId}
          onChange={(event) => {
            const nextFileName = event.target.files?.[0]?.name || emptyLabel;
            setFileName(nextFileName);
            onChange?.(event);
          }}
          type="file"
        />
        <span className={styles.fileButton}>
          <span aria-hidden="true">↑</span>
          {actionLabel}
        </span>
        <span aria-live="polite" className={styles.fileName}>
          {fileName}
        </span>
      </label>
    </div>
  );
}
