import styles from "./ui.module.css";

type SpinnerProps = {
  label?: string;
};

export function Spinner({ label = "Carregando" }: SpinnerProps) {
  return (
    <span className={styles.spinnerWrap}>
      <span aria-hidden className={styles.spinner} />
      <span>{label}</span>
    </span>
  );
}
