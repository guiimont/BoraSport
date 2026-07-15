import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentPropsWithoutRef } from "react";

import styles from "./ui.module.css";

type ButtonVariant = "primary" | "secondary" | "ghost";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

type ActionLinkProps = ComponentPropsWithoutRef<typeof Link> & {
  variant?: ButtonVariant;
};

function getButtonClassName(variant: ButtonVariant, className?: string) {
  return `${styles.button} ${styles[`button${variant}`]} ${className || ""}`;
}

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonProps) {
  return (
    <button
      className={getButtonClassName(variant, className)}
      {...props}
    />
  );
}

export function ActionLink({
  className,
  variant = "primary",
  ...props
}: ActionLinkProps) {
  return (
    <Link
      className={getButtonClassName(variant, className)}
      {...props}
    />
  );
}
