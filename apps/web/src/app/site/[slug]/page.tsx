import Link from "next/link";
import { notFound } from "next/navigation";

import {
  getCompanyBySlug,
  getPublishedLandingPageBySlug,
} from "../../../lib/saas/queries";
import styles from "./site.module.css";

type SitePageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function SitePage({ params }: SitePageProps) {
  const { slug } = await params;
  const [company, landingPage] = await Promise.all([
    getCompanyBySlug(slug),
    getPublishedLandingPageBySlug(slug),
  ]);

  if (!company || !landingPage) {
    notFound();
  }

  return (
    <main className={styles.page}>
      <section
        className={styles.hero}
        style={
          landingPage.hero_image_url
            ? { backgroundImage: `url(${landingPage.hero_image_url})` }
            : undefined
        }
      >
        <div className={styles.overlay}>
          <p className={styles.eyebrow}>{company.name}</p>
          <h1>{landingPage.title}</h1>
          {landingPage.subtitle ? <p>{landingPage.subtitle}</p> : null}
          <Link className={styles.cta} href={`/clube/${company.slug}`}>
            {landingPage.cta_label}
          </Link>
        </div>
      </section>

      <section className={styles.sections}>
        {landingPage.sections.length > 0 ? (
          landingPage.sections.map((section, index) => (
            <article className={styles.card} key={index}>
              <span>{String(section.label || `Diferencial ${index + 1}`)}</span>
              <p>{String(section.text || "")}</p>
            </article>
          ))
        ) : (
          <article className={styles.card}>
            <span>Agenda integrada</span>
            <p>Escolha um horário disponível e reserve diretamente pela plataforma.</p>
          </article>
        )}
      </section>
    </main>
  );
}
