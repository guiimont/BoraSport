import type { ReactNode } from "react";

import styles from "./brand-system.module.css";

export type BrandIconName = "aito" | "amuiraa" | "faatere" | "hoe" | "mahana" | "moana" | "pu" | "rahui" | "taata";

export function BrandIcon({ name, title }: { name: BrandIconName; title?: string }) {
  const common = { className: styles.icon, role: title ? "img" : undefined, "aria-hidden": title ? undefined : true, viewBox: "0 0 32 32" } as const;
  const label = title ? <title>{title}</title> : null;

  if (name === "amuiraa") return <svg {...common}>{label}<circle cx="16" cy="16" r="13"/><path d="M5 18c3-5 7-5 11 0 4 5 8 5 11 0M6 13c3-4 6-4 10 0 4 4 7 4 10 0M9 22c2-2 4-2 7 0 3 2 5 2 7 0"/></svg>;
  if (name === "hoe") return <svg {...common}>{label}<path d="M7 4c4 3 6 7 5 11L5 28M25 4c-4 3-6 7-5 11l7 13M9 7l14 18M23 7 9 25"/><path d="m4 27 4-1-2-3-2 4Zm24 0-4-1 2-3 2 4Z"/></svg>;
  if (name === "moana") return <svg {...common}>{label}<circle cx="16" cy="16" r="11"/><path d="m16 2 2.5 11.5L30 16l-11.5 2.5L16 30l-2.5-11.5L2 16l11.5-2.5L16 2Z"/><path d="m16 9 2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5Z"/></svg>;
  if (name === "aito") return <svg {...common}>{label}<path d="m16 3 10 5v9c0 6-4 10-10 12C10 27 6 23 6 17V8l10-5Z"/><path d="m10 12 6-4 6 4-2 8-4 4-4-4-2-8Zm1 2 4 1m6-1-4 1m-1-7v16"/></svg>;
  if (name === "mahana") return <svg {...common}>{label}<path d="M3 23h26M6 19h20M9 19a7 7 0 0 1 14 0M16 3v5M5 10l4 3m18-3-4 3M3 17h4m18 0h4"/></svg>;
  if (name === "faatere") return <svg {...common}>{label}<path d="M16 3v25M12 6h8l2 5H10l2-5ZM5 13h22M4 13l2 10h20l2-10M8 13v10m16-10v10M3 26h26"/></svg>;
  if (name === "taata") return <svg {...common}>{label}<circle cx="16" cy="7" r="3"/><circle cx="8" cy="15" r="3"/><circle cx="24" cy="15" r="3"/><circle cx="12" cy="24" r="3"/><circle cx="20" cy="24" r="3"/><path d="M16 10v4M11 15h10M9 18l2 3m12-3-2 3m-6-5-2 5m4-5 2 5"/></svg>;
  if (name === "pu") return <svg {...common}>{label}<path d="M8 5 27 24l-3 3L5 8l3-3Zm16 0L5 24l3 3L27 8l-3-3Z"/><path d="m16 10 6 6-6 6-6-6 6-6Z"/></svg>;
  return <svg {...common}>{label}<path d="m16 3 10 5v8c0 6-4 10-10 13C10 26 6 22 6 16V8l10-5Z"/><path d="M11 16l3 3 7-8"/></svg>;
}

export function BrandEmblem({ name, title }: { name: BrandIconName; title?: string }) {
  return <span className={styles.emblem}><BrandIcon name={name} title={title} /><i /><b /></span>;
}

export function DividerNihoMano() {
  return <div aria-hidden className={styles.divider}><span /><i className={styles.dividerMark} /><span /></div>;
}

export function AncestralDivider({ variant = "niho" }: { variant?: "lashings" | "niho" | "swells" }) {
  return <div aria-hidden className={styles.ancestralDivider} data-variant={variant}><i /><span /><i /></div>;
}

export function RahuiSeal() {
  return <span className={styles.rahui}><BrandIcon name="rahui" /><span><strong>Modo Rāhui Ativo</strong><small>Saúde e trajeto protegidos</small></span></span>;
}

export function PanuiCard({ children }: { children: ReactNode }) {
  return <section className={styles.panui}>{children}</section>;
}

export function HeaderFrameGold({ children }: { children: ReactNode }) {
  return <div className={styles.goldFrame}>{children}</div>;
}
