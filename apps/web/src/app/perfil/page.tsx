import { redirect } from "next/navigation";

import {
  getCurrentProfile,
  getCurrentAthletePrivacySettings,
  getCurrentUser,
  getCurrentUserActivityRecords,
  getCurrentUserBodyMeasurements,
  getCurrentUserMemberships,
} from "../../lib/saas/queries";
import { ActionLink, Alert, MasteryShowcase, MemberShell } from "../../components/ui";
import { ProfileForm } from "./profile-form";
import { PrivacySettingsForm } from "./privacy-settings-form";
import styles from "./profile.module.css";

const numberFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 1,
});

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  timeZone: "America/Sao_Paulo",
  year: "numeric",
});

function formatDuration(totalSeconds: number | null) {
  if (!totalSeconds) {
    return "—";
  }

  const totalMinutes = Math.round(totalSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return hours
    ? `${hours}h ${minutes.toString().padStart(2, "0")}min`
    : `${minutes}min`;
}

export default async function ProfilePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/perfil");
  }

  const [
    profile,
    memberships,
    activities,
    bodyMeasurements,
    privacySettings,
  ] = await Promise.all([
    getCurrentProfile(),
    getCurrentUserMemberships(),
    getCurrentUserActivityRecords(),
    getCurrentUserBodyMeasurements(),
    getCurrentAthletePrivacySettings(),
  ]);
  const latestBodyMeasurement = bodyMeasurements[0] ?? null;
  const primaryCompany = memberships[0]?.companies ?? null;
  const companiesById = new Map(
    memberships.flatMap((membership) =>
      membership.companies
        ? [[membership.company_id, membership.companies.name] as const]
        : [],
    ),
  );
  const totalDistanceMeters = activities.reduce(
    (total, activity) => total + (activity.distance_meters ?? 0),
    0,
  );
  const totalDurationSeconds = activities.reduce(
    (total, activity) => total + (activity.duration_seconds ?? 0),
    0,
  );
  const hasValidName =
    Boolean(profile?.name?.trim()) && !profile?.name?.includes("@");
  const isProfileIncomplete =
    !hasValidName ||
    !profile?.phone ||
    !profile?.avatar_url ||
    !latestBodyMeasurement;

  return (
    <MemberShell
      active="aito"
      company={primaryCompany}
      context="‘Aito · Atleta & Ajustes"
      description="Sua identidade no va'a: clubes, remadas e evolução reunidos em uma única jornada."
      greetingName={profile?.name?.split(" ")[0] ?? null}
      title="Identidade do atleta"
    >
      <section className={styles.sportSummary} aria-label="Resumo esportivo">
        <article className={styles.summaryCard}>
          <span>Remadas registradas</span>
          <strong>{activities.length}</strong>
          <small>Atividades no seu histórico</small>
        </article>
        <article className={styles.summaryCard}>
          <span>Distância acumulada</span>
          <strong>{numberFormatter.format(totalDistanceMeters / 1000)} km</strong>
          <small>Somente atividades com distância</small>
        </article>
        <article className={styles.summaryCard}>
          <span>Tempo na água</span>
          <strong>{formatDuration(totalDurationSeconds)}</strong>
          <small>Duração total registrada</small>
        </article>
        <article className={styles.summaryCard}>
          <span>Clubes</span>
          <strong>{memberships.length}</strong>
          <small>Vínculos ativos no BoraSport</small>
        </article>
      </section>

      <div className={styles.masteryJourney}>
        <MasteryShowcase compact />
      </div>

      <div className={styles.layout}>
        <section className={styles.profilePanel} aria-labelledby="profile-heading">
          {isProfileIncomplete ? (
            <Alert tone="warning">
              Complete nome, telefone e foto para deixar seu perfil pronto para
              a rotina do clube.
            </Alert>
          ) : (
            <Alert tone="success">
              Seu perfil básico está pronto para aparecer nas reservas.
            </Alert>
          )}

          <ProfileForm
            companyName={primaryCompany?.name}
            email={user.email || ""}
            latestWeightKg={latestBodyMeasurement?.weight_kg ?? null}
            profile={profile}
          />
        </section>

        <aside className={styles.sidePanel} aria-label="Resumo do perfil">
          <section className={styles.card}>
            <p className={styles.eyebrow}>Minha jornada</p>
            <h3>Atividades recentes</h3>
            {activities.length ? (
              <ol className={styles.activityList}>
                {activities.slice(0, 5).map((activity) => (
                  <li key={activity.id}>
                    <div>
                      <strong>{activity.title || "Remada"}</strong>
                      <span>
                        {dateFormatter.format(new Date(activity.started_at))}
                        {companiesById.get(activity.company_id)
                          ? ` · ${companiesById.get(activity.company_id)}`
                          : ""}
                      </span>
                    </div>
                    <p>
                      {activity.distance_meters !== null
                        ? `${numberFormatter.format(activity.distance_meters / 1000)} km`
                        : "Distância não informada"}
                      {activity.duration_seconds
                        ? ` · ${formatDuration(activity.duration_seconds)}`
                        : ""}
                    </p>
                  </li>
                ))}
              </ol>
            ) : (
              <div className={styles.emptyJourney}>
                <span aria-hidden>≈</span>
                <p>
                  Suas remadas aparecerão aqui quando uma atividade for
                  concluída ou sincronizada.
                </p>
              </div>
            )}
          </section>

          <section className={styles.card}>
            <p className={styles.eyebrow}>Meus clubes</p>
            {memberships.length ? (
              <>
                <ul className={styles.clubList}>
                  {memberships.map((membership) =>
                    membership.companies ? (
                      <li key={membership.id}>
                        <strong>{membership.companies.name}</strong>
                        <ActionLink
                          href={`/clube/${membership.companies.slug}`}
                          variant="secondary"
                        >
                          Acessar
                        </ActionLink>
                      </li>
                    ) : null,
                  )}
                </ul>
                <p className={styles.cardText}>
                  Seus vínculos acompanham você entre clubes, equipes e viagens.
                </p>
              </>
            ) : (
              <p className={styles.cardText}>
                Nenhum clube foi identificado para esta conta neste momento.
                Quando houver vínculo, o acesso ao clube aparecerá aqui.
              </p>
            )}
          </section>

          <section className={styles.card}>
            <p className={styles.eyebrow}>Somente você</p>
            <h3>Evolução do peso</h3>
            {bodyMeasurements.length ? (
              <ol className={styles.activityList}>
                {bodyMeasurements.slice(0, 5).map((measurement) => (
                  <li key={measurement.id}>
                    <div>
                      <strong>{numberFormatter.format(measurement.weight_kg)} kg</strong>
                      <span>
                        {dateFormatter.format(new Date(measurement.recorded_at))}
                      </span>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className={styles.cardText}>
                Seu primeiro registro será criado ao salvar o perfil.
              </p>
            )}
            <p className={styles.cardText}>
              Este histórico é privado. Clube, treinador e outros remadores não
              recebem acesso aos valores.
            </p>
          </section>

          <section className={styles.card}>
            <p className={styles.eyebrow}>Privacidade & Comunidade</p>
            <h3>Suas escolhas</h3>
            <PrivacySettingsForm settings={privacySettings} />
          </section>

          <section className={styles.card}>
            <p className={styles.eyebrow}>Dispositivos & Aplicativos</p>
            <h3>Conexões de atividade</h3>
            <ul className={styles.connectionList}>
              <li><div><strong>FIT, GPX e TCX</strong><span>Importação direta em Hoe</span></div><em data-active="true">Ativo</em></li>
              <li><div><strong>Garmin</strong><span>Conexão oficial ainda não autorizada</span></div><em>Não conectado</em></li>
              <li><div><strong>Strava</strong><span>Conexão oficial ainda não autorizada</span></div><em>Não conectado</em></li>
            </ul>
            <p className={styles.cardText}>Nenhuma conexão será simulada: Garmin e Strava exigem credenciais e autorização oficial dos provedores.</p>
          </section>

          <section className={styles.card}>
            <p className={styles.eyebrow}>Conta e segurança</p>
            <h3>E-mail de acesso</h3>
            <p className={styles.accountEmail}>{user.email || "Não informado"}</p>
            <p className={styles.cardText}>
              Este é o e-mail usado para entrar no BoraSport.
            </p>
          </section>
        </aside>
      </div>
    </MemberShell>
  );
}
