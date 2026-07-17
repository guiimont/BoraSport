import styles from "./ui.module.css";

type BrandMarkProps = {
  className?: string;
  iconOnly?: boolean;
  label?: string;
  tone?: "light" | "dark";
  variant?: "dark" | "light" | "monochromeLight" | "monochromeDark";
};

const symbolByVariant: Record<NonNullable<BrandMarkProps["variant"]>, string> = {
  dark: "/brand/symbol-color-dark-512.png",
  light: "/brand/symbol-color-light-512.png",
  monochromeDark: "/brand/symbol-mono-dark-512.png",
  monochromeLight: "/brand/symbol-mono-light-512.png",
};

export function BrandMark({
  className = "",
  iconOnly = false,
  label = "BoraSport",
  tone = "light",
  variant,
}: BrandMarkProps) {
  const resolvedVariant =
    variant ?? (tone === "dark" ? "light" : "dark");

  return (
    <span
      className={`${styles.brandMark} ${
        tone === "dark" ? styles.brandMarkDark : ""
      } ${iconOnly ? styles.brandMarkIconOnly : ""} ${className}`}
      aria-label={iconOnly ? label : undefined}
    >
      <span className={styles.brandSymbol} aria-hidden={!iconOnly}>
        <img
          alt={iconOnly ? label : ""}
          height={40}
          src={symbolByVariant[resolvedVariant]}
          width={40}
        />
      </span>
      {iconOnly ? null : <span className={styles.brandText}>{label}</span>}
    </span>
  );
}
