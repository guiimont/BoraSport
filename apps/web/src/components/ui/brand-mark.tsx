import styles from "./ui.module.css";

type BrandMarkProps = {
  className?: string;
  tone?: "light" | "dark";
};

export function BrandMark({ className = "", tone = "light" }: BrandMarkProps) {
  return (
    <span
      className={`${styles.brandMark} ${
        tone === "dark" ? styles.brandMarkDark : ""
      } ${className}`}
    >
      <span className={styles.brandSymbol}>B</span>
      <span className={styles.brandText}>BoraSport</span>
    </span>
  );
}
