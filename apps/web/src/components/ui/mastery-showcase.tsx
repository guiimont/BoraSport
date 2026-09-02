import { BrandIcon, type BrandIconName } from "./brand-system";
import styles from "./mastery-showcase.module.css";

const recognitions: Array<{
  icon: BrandIconName;
  kind: string;
  name: string;
  summary: string;
  tone: string;
}> = [
  { icon: "hoe", kind: "Jornada esportiva", name: "Hoe Hou", summary: "Primeiros movimentos e vínculo com o va‘a.", tone: "starter" },
  { icon: "mahana", kind: "Jornada esportiva", name: "Hoe Ata", summary: "Ritmo, presença e consistência na água.", tone: "rhythm" },
  { icon: "aito", kind: "Jornada esportiva", name: "‘Aito Moana", summary: "Evolução construída em atividades auditáveis.", tone: "mastery" },
  { icon: "faatere", kind: "Credencial técnica", name: "Fa‘atere", summary: "Navegação e liderança reconhecidas à parte.", tone: "credential" },
];

export function MasteryShowcase({ compact = false }: { compact?: boolean }) {
  return (
    <section className={styles.showcase} data-compact={compact || undefined} aria-label="Jornada de reconhecimento BoraSport">
      <div className={styles.intro}>
        <div>
          <span>Reconhecimento BoraSport</span>
          <h2>Uma jornada que respeita o mar e comprova a evolução.</h2>
        </div>
        <p>Atividades reais constroem a história esportiva. Critérios e credenciais serão validados com a comunidade antes de liberar conquistas.</p>
      </div>
      <div className={styles.grid}>
        {recognitions.map((item) => (
          <article className={styles.card} data-tone={item.tone} key={item.name}>
            <div className={styles.crest}><BrandIcon name={item.icon} /></div>
            <span>{item.kind}</span>
            <h3>{item.name}</h3>
            <p>{item.summary}</p>
            <small>Critérios em validação</small>
          </article>
        ))}
      </div>
    </section>
  );
}
