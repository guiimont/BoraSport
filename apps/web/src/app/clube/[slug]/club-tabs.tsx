"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import type { ActivityExperience } from "../../../lib/saas/activity-presets";
import type {
  CompanySlot,
  SlotParticipant,
  VocabularyConfig,
  WeeklyWorkout,
} from "../../../types/saas";

import styles from "./club-page.module.css";
import { ReservationSlots } from "./reservation-slots";

type ClubTabsProps = {
  companyId: string;
  currentUserBookedSlotIds: string[];
  experience: ActivityExperience;
  participantsBySlot: Record<string, SlotParticipant[]>;
  slug: string;
  slots: CompanySlot[];
  weeklyWorkouts: WeeklyWorkout[];
  vocabulary: Required<VocabularyConfig>;
};

type TabId = ActivityExperience["tabs"][number]["id"];

type SeaLocation = {
  label: string;
  latitude: number;
  longitude: number;
};

type SeaConditions = {
  sunrise: string;
  sunset: string;
  swell: string;
  tide: string;
  updatedAt: string;
  wind: string;
};

const defaultSeaLocation: SeaLocation = {
  label: "Praia de Itaipu, Niteroi, RJ",
  latitude: -22.9708,
  longitude: -43.0469,
};

type NominatimResult = {
  addresstype?: string;
  class?: string;
  display_name?: string;
  lat: string;
  lon: string;
  name?: string;
  type?: string;
};

function formatTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function dayKey(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    weekday: "short",
  }).format(new Date(value));
}

function remainingSpots(slot: CompanySlot) {
  return Math.max(
    0,
    Number(slot.spots_total || 0) - Number(slot.spots_occupied || 0),
  );
}

function formatDirection(value?: number | null) {
  if (typeof value !== "number") {
    return "";
  }

  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return directions[Math.round(value / 45) % 8];
}

function formatHour(value?: string | null) {
  if (!value) {
    return "--";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function buildWindyUrl(location: SeaLocation) {
  const params = new URLSearchParams({
    calendar: "now",
    detail: "true",
    detailLat: String(location.latitude),
    detailLon: String(location.longitude),
    height: "450",
    lat: String(location.latitude),
    level: "surface",
    location: "coordinates",
    marker: "true",
    menu: "",
    message: "true",
    metricTemp: "°C",
    metricWind: "kt",
    overlay: "wind",
    pressure: "true",
    product: "ecmwf",
    radarRange: "-1",
    type: "map",
    width: "650",
    zoom: "11",
  });

  return `https://embed.windy.com/embed2.html?${params.toString()}`;
}

function buildBrazilSearchVariants(query: string) {
  const normalized = query
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const hasBrazilContext = /\bbrasil\b|\bbrazil\b|\brj\b|\bsp\b/i.test(query);
  const withBrazil = hasBrazilContext ? query : `${query}, Brasil`;
  const variants = [
    withBrazil,
    `Praia de ${query}, Brasil`,
    `${query} praia, Brasil`,
    `${query}, litoral, Brasil`,
  ];

  if (normalized.includes("niteroi") || normalized.includes("niteroi")) {
    variants.unshift(
      `${query}, Niteroi, Rio de Janeiro, Brasil`,
      `Praia de ${query}, Niteroi, Rio de Janeiro, Brasil`,
    );
  }

  return Array.from(new Set(variants));
}

function scoreNominatimResult(result: NominatimResult, query: string) {
  const haystack = [
    result.name,
    result.display_name,
    result.class,
    result.type,
    result.addresstype,
  ]
    .join(" ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const normalizedQuery = query
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  let score = 0;

  if (haystack.includes("beach") || haystack.includes("praia")) {
    score += 80;
  }

  if (haystack.includes("coast") || haystack.includes("bay")) {
    score += 30;
  }

  for (const token of normalizedQuery.split(/\s+/).filter(Boolean)) {
    if (haystack.includes(token)) {
      score += 10;
    }
  }

  if (haystack.includes("niteroi") || haystack.includes("rio de janeiro")) {
    score += 8;
  }

  return score;
}

async function findNominatimLocation(query: string): Promise<SeaLocation | null> {
  const variants = buildBrazilSearchVariants(query);
  const candidates: NominatimResult[] = [];

  for (const variant of variants) {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", variant);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("countrycodes", "br");
    url.searchParams.set("limit", "5");
    url.searchParams.set("accept-language", "pt-BR");

    const response = await fetch(url);

    if (!response.ok) {
      continue;
    }

    const results = (await response.json()) as NominatimResult[];
    candidates.push(...results);

    if (
      results.some(
        (result) =>
          result.type === "beach" ||
          result.addresstype === "beach" ||
          result.display_name?.toLowerCase().includes("praia"),
      )
    ) {
      break;
    }
  }

  const best = candidates
    .filter((result) => Number.isFinite(Number(result.lat)) && Number.isFinite(Number(result.lon)))
    .sort(
      (left, right) =>
        scoreNominatimResult(right, query) - scoreNominatimResult(left, query),
    )[0];

  if (!best) {
    return null;
  }

  const label =
    best.name ||
    best.display_name?.split(",").slice(0, 3).join(", ") ||
    query;

  return {
    label,
    latitude: Number(best.lat),
    longitude: Number(best.lon),
  };
}

async function findSeaLocation(search: string): Promise<SeaLocation> {
  const query = search.trim();

  if (!query) {
    return defaultSeaLocation;
  }

  const normalizedQuery = query.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const searchQuery =
    /\bbrasil\b|\bbrazil\b|\brj\b|\bsp\b/i.test(normalizedQuery)
      ? query
      : `${query}, Brasil`;

  const nominatimLocation = await findNominatimLocation(query);

  if (nominatimLocation) {
    return nominatimLocation;
  }

  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", searchQuery);
  url.searchParams.set("count", "5");
  url.searchParams.set("language", "pt");
  url.searchParams.set("format", "json");

  const response = await fetch(url);
  if (response.ok) {
    const data = (await response.json()) as {
      results?: Array<{
        admin1?: string;
        country_code?: string;
        latitude: number;
        longitude: number;
        name: string;
      }>;
    };
    const result =
      data.results?.find((item) => item.country_code === "BR") ||
      data.results?.[0];

    if (result) {
      return {
        label: [result.name, result.admin1, result.country_code]
          .filter(Boolean)
          .join(", "),
        latitude: result.latitude,
        longitude: result.longitude,
      };
    }
  }

  const photonUrl = new URL("https://photon.komoot.io/api/");
  photonUrl.searchParams.set("q", searchQuery);
  photonUrl.searchParams.set("limit", "5");
  photonUrl.searchParams.set("lang", "pt");

  const photonResponse = await fetch(photonUrl);
  if (!photonResponse.ok) {
    throw new Error("Nao foi possivel localizar esse ponto.");
  }

  const photonData = (await photonResponse.json()) as {
    features?: Array<{
      geometry?: { coordinates?: [number, number] };
      properties?: {
        city?: string;
        country?: string;
        name?: string;
        state?: string;
      };
    }>;
  };
  const feature =
    photonData.features?.find(
      (item) =>
        item.properties?.country === "Brazil" ||
        item.properties?.country === "Brasil",
    ) || photonData.features?.[0];
  const coordinates = feature?.geometry?.coordinates;

  if (!feature || !coordinates) {
    throw new Error("Local nao encontrado. Tente cidade, praia ou bairro.");
  }

  return {
    label: [
      feature.properties?.name || feature.properties?.city,
      feature.properties?.state,
      feature.properties?.country === "Brazil"
        ? "BR"
        : feature.properties?.country,
    ]
      .filter(Boolean)
      .join(", "),
    latitude: coordinates[1],
    longitude: coordinates[0],
  };
}

async function getSeaConditions(location: SeaLocation): Promise<SeaConditions> {
  const forecastUrl = new URL("https://api.open-meteo.com/v1/forecast");
  forecastUrl.searchParams.set("latitude", String(location.latitude));
  forecastUrl.searchParams.set("longitude", String(location.longitude));
  forecastUrl.searchParams.set(
    "current",
    "wind_speed_10m,wind_direction_10m,wind_gusts_10m",
  );
  forecastUrl.searchParams.set("daily", "sunrise,sunset");
  forecastUrl.searchParams.set("wind_speed_unit", "kn");
  forecastUrl.searchParams.set("timezone", "auto");

  const marineUrl = new URL("https://marine-api.open-meteo.com/v1/marine");
  marineUrl.searchParams.set("latitude", String(location.latitude));
  marineUrl.searchParams.set("longitude", String(location.longitude));
  marineUrl.searchParams.set(
    "current",
    "wave_height,wave_direction,wave_period,swell_wave_height,swell_wave_direction,swell_wave_period",
  );
  marineUrl.searchParams.set("timezone", "auto");

  const [forecastResponse, marineResponse] = await Promise.all([
    fetch(forecastUrl),
    fetch(marineUrl),
  ]);

  if (!forecastResponse.ok) {
    throw new Error("Nao foi possivel buscar vento para esse local.");
  }

  const forecast = (await forecastResponse.json()) as {
    current?: {
      time?: string;
      wind_direction_10m?: number;
      wind_gusts_10m?: number;
      wind_speed_10m?: number;
    };
    daily?: {
      sunrise?: string[];
      sunset?: string[];
    };
  };
  const marine = marineResponse.ok
    ? ((await marineResponse.json()) as {
        current?: {
          swell_wave_direction?: number;
          swell_wave_height?: number;
          swell_wave_period?: number;
          wave_direction?: number;
          wave_height?: number;
          wave_period?: number;
        };
      })
    : null;

  const current = forecast.current;
  const wave = marine?.current;
  const windDirection = formatDirection(current?.wind_direction_10m);
  const waveDirection = formatDirection(
    wave?.swell_wave_direction ?? wave?.wave_direction,
  );
  const waveHeight = wave?.swell_wave_height ?? wave?.wave_height;
  const wavePeriod = wave?.swell_wave_period ?? wave?.wave_period;

  return {
    sunrise: formatHour(forecast.daily?.sunrise?.[0]),
    sunset: formatHour(forecast.daily?.sunset?.[0]),
    swell:
      typeof waveHeight === "number"
        ? `${waveHeight.toFixed(1)} m ${waveDirection} / ${Math.round(
            wavePeriod || 0,
          )}s`
        : "Veja no Windy",
    tide: "Validar tabua local",
    updatedAt: formatHour(current?.time),
    wind:
      typeof current?.wind_speed_10m === "number"
        ? `${Math.round(current.wind_speed_10m)} kt ${windDirection}`
        : "Veja no Windy",
  };
}

function getWeekPreview(slots: CompanySlot[]) {
  const grouped = new Map<string, { label: string; slots: CompanySlot[] }>();

  for (const slot of slots) {
    const label = dayKey(slot.start_time);
    const current = grouped.get(label) || { label, slots: [] };
    current.slots.push(slot);
    grouped.set(label, current);
  }

  return Array.from(grouped.values()).slice(0, 7);
}

function AvatarStack({ participants }: { participants: SlotParticipant[] }) {
  return (
    <div className={styles.avatarStack}>
      {participants.slice(0, 6).map((participant) => (
        <Link
          className={styles.avatar}
          href={`/remadores/${participant.public_profile_id}`}
          key={`${participant.slot_id}-${participant.public_profile_id}`}
          title={participant.name}
        >
          {participant.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt="" src={participant.avatar_url} />
          ) : (
            participant.name.slice(0, 1).toUpperCase()
          )}
        </Link>
      ))}
      {participants.length > 6 ? (
        <span className={`${styles.avatar} ${styles.avatarMore}`}>
          +{participants.length - 6}
        </span>
      ) : null}
    </div>
  );
}

export function ClubTabs({
  companyId,
  currentUserBookedSlotIds,
  experience,
  participantsBySlot,
  slug,
  slots,
  weeklyWorkouts,
  vocabulary,
}: ClubTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("agenda");
  const tabs = experience.tabs;
  const activeTabMeta = tabs.find((tab) => tab.id === activeTab) || tabs[0];

  return (
    <section className={styles.content}>
      <div className={styles.tabsBar}>
        <div className={styles.tabsScroller}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;

            return (
              <button
                className={`${styles.tabButton} ${
                  isActive ? styles.tabButtonActive : ""
                }`}
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                type="button"
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className={styles.intro}>
        <p className={styles.introLabel}>{activeTabMeta.label}</p>
        <p className={styles.introText}>
          {activeTab === "agenda"
            ? experience.agendaHint
            : experience.conditionDescription}
        </p>
      </div>

      {activeTab === "condicoes" ? (
        <ConditionPanel experience={experience} />
      ) : null}
      <div hidden={activeTab !== "agenda"}>
        <AgendaPanel
          companyId={companyId}
          currentUserBookedSlotIds={currentUserBookedSlotIds}
          experience={experience}
          participantsBySlot={participantsBySlot}
          slug={slug}
          slots={slots}
          vocabulary={vocabulary}
        />
      </div>
      {activeTab === "semana" ? (
        <WeekPanel slots={slots} weeklyWorkouts={weeklyWorkouts} />
      ) : null}
      {activeTab === "comunidade" ? (
        <CommunityPanel
          experience={experience}
          participantsBySlot={participantsBySlot}
          slots={slots}
        />
      ) : null}
      {activeTab === "divulgacao" ? <PromotionPanel /> : null}
    </section>
  );
}

function ConditionPanel({ experience }: { experience: ActivityExperience }) {
  const [conditions, setConditions] = useState<SeaConditions | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [location, setLocation] = useState(defaultSeaLocation);
  const [search, setSearch] = useState(defaultSeaLocation.label);
  const [resolvedSearch, setResolvedSearch] = useState(defaultSeaLocation.label);

  async function updateLocation(nextSearch = search, silent = false) {
    const cleanSearch = nextSearch.trim();

    if (cleanSearch.length < 3) {
      return;
    }

    if (!silent) {
      setError(null);
    }

    setIsLoading(true);

    try {
      const nextLocation = await findSeaLocation(cleanSearch);
      const nextConditions = await getSeaConditions(nextLocation);
      setLocation(nextLocation);
      setConditions(nextConditions);
      setResolvedSearch(nextLocation.label);
      setError(null);
    } catch (caughtError) {
      if (!silent) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Nao foi possivel atualizar as condicoes.",
        );
      }
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (experience.conditionMode !== "sea") {
      return;
    }

    const cleanSearch = search.trim();

    if (cleanSearch.length < 3 || cleanSearch === resolvedSearch) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void updateLocation(cleanSearch, true);
    }, 650);

    return () => window.clearTimeout(timeoutId);
  }, [experience.conditionMode, resolvedSearch, search]);

  if (experience.conditionMode !== "sea") {
    return (
      <div className={styles.card}>
        <h2 className={styles.sectionTitle}>{experience.safetyTitle}</h2>
        <div className={`${styles.tileGrid} ${styles.tileGridTwo}`}>
          {experience.safetyItems.map((item) => (
            <div className={styles.tile} key={item}>
              <p>{item}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={styles.locationPanel}>
        <div>
          <p className={styles.introLabel}>Local da remada</p>
          <p className={styles.introText}>
            Digite praia, bairro ou cidade para centralizar o Windy e atualizar
            a leitura rapida.
          </p>
        </div>
        <form
          className={styles.locationForm}
          onSubmit={(event) => {
            event.preventDefault();
            void updateLocation(search);
          }}
        >
          <input
            className={styles.locationInput}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Ex: Praia de Santos, Ubatuba, Lagoa da Conceicao"
            value={search}
          />
          <button className={styles.locationButton} disabled={isLoading} type="submit">
            {isLoading ? "Buscando..." : "Atualizar"}
          </button>
        </form>
        {error ? <p className={styles.errorText}>{error}</p> : null}
        <p className={styles.locationResolved}>
          Windy centralizado em {resolvedSearch}
        </p>
      </div>

      <div className={styles.conditionGrid}>
        <div className={styles.windyFrame}>
          <iframe
            key={`${location.latitude}-${location.longitude}`}
            loading="lazy"
            src={buildWindyUrl(location)}
            title={`Condicoes do mar em tempo real - ${location.label}`}
          />
        </div>

        <aside className={styles.card}>
          <h2 className={styles.sectionTitle}>Leitura rapida</h2>
          <p className={styles.introText}>{location.label}</p>
          <div className={`${styles.tileGrid} ${styles.tileGridTwo}`}>
            {[
              ["Vento", conditions?.wind || "Atualize o local"],
              ["Ondulacao", conditions?.swell || "Atualize o local"],
              ["Mare", conditions?.tide || "Validar tabua local"],
              [
                "Sol",
                conditions
                  ? `${conditions.sunrise} / ${conditions.sunset}`
                  : "Atualize o local",
              ],
            ].map(([item, value]) => (
              <div className={styles.tile} key={item}>
                <p>{item}</p>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
          <p className={styles.introText}>{experience.safetyItems[0]}</p>
          {conditions?.updatedAt ? (
            <p className={styles.conditionFootnote}>
              Atualizado as {conditions.updatedAt}. Use a leitura junto com o
              mapa do Windy e a orientacao do clube.
            </p>
          ) : null}
        </aside>
      </div>
    </>
  );
}

function AgendaPanel({
  companyId,
  currentUserBookedSlotIds,
  experience,
  participantsBySlot,
  slug,
  slots,
  vocabulary,
}: {
  companyId: string;
  currentUserBookedSlotIds: string[];
  experience: ActivityExperience;
  participantsBySlot: Record<string, SlotParticipant[]>;
  slug: string;
  slots: CompanySlot[];
  vocabulary: Required<VocabularyConfig>;
}) {
  return (
    <div>
      <div className={styles.agendaHeader}>
        <h2 className={styles.sectionTitle}>
          {vocabulary.service_label}s disponíveis
        </h2>
        <p className={styles.muted}>{slots.length} horários publicados</p>
      </div>

      <ReservationSlots
        companyId={companyId}
        currentUserBookedSlotIds={currentUserBookedSlotIds}
        experience={experience}
        participantsBySlot={participantsBySlot}
        slug={slug}
        slots={slots}
        vocabulary={vocabulary}
      />
    </div>
  );
}

function WeekPanel({
  slots,
  weeklyWorkouts,
}: {
  slots: CompanySlot[];
  weeklyWorkouts: WeeklyWorkout[];
}) {
  const workoutsByDay = new Map(
    weeklyWorkouts.map((workout) => [workout.weekday, workout]),
  );
  const weekdays = [
    [1, "Segunda"],
    [2, "Terca"],
    [3, "Quarta"],
    [4, "Quinta"],
    [5, "Sexta"],
    [6, "Sabado"],
    [7, "Domingo"],
  ] as const;
  const saoPauloDateKey = (value: Date | string) =>
    new Intl.DateTimeFormat("en-CA", {
      day: "2-digit",
      month: "2-digit",
      timeZone: "America/Sao_Paulo",
      year: "numeric",
    }).format(typeof value === "string" ? new Date(value) : value);
  const today = new Date(`${saoPauloDateKey(new Date())}T12:00:00-03:00`);
  const todayWeekday = today.getDay() === 0 ? 7 : today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - todayWeekday + 1);
  const weekDateKeys = new Map<number, string>(
    weekdays.map(([weekday]) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + weekday - 1);
      return [weekday, saoPauloDateKey(date)];
    }),
  );
  const slotsByDay = new Map<number, CompanySlot[]>();

  for (const slot of slots) {
    const weekday = weekdays.find(
      ([day]) => weekDateKeys.get(day) === saoPauloDateKey(slot.start_time),
    )?.[0];

    if (weekday) {
      slotsByDay.set(weekday, [...(slotsByDay.get(weekday) || []), slot]);
    }
  }

  const publishedDays = weekdays.filter(
    ([weekday]) =>
      workoutsByDay.has(weekday) || (slotsByDay.get(weekday)?.length || 0) > 0,
  );

  return (
    <div className={styles.card}>
      <h2 className={styles.sectionTitle}>Treinos da semana</h2>
      <div className={styles.tileGrid}>
        {publishedDays.length > 0 ? (
          publishedDays.map(([weekday, label]) => {
            const workout = workoutsByDay.get(weekday);
            const daySlots = slotsByDay.get(weekday) || [];

            return (
              <div className={styles.weekWorkout} key={weekday}>
                <div>
                  <strong>{label}</strong>
                  {workout ? <h3>{workout.title}</h3> : null}
                  {workout?.description ? <p>{workout.description}</p> : null}
                  {daySlots.map((slot) => (
                    <div className={styles.weekSlot} key={slot.id}>
                      <div>
                        <h3>{slot.services?.name || "Treino"}</h3>
                        <p>
                          {formatTime(slot.start_time)}
                          {slot.resources?.name
                            ? ` · ${slot.resources.name}`
                            : ""}
                        </p>
                      </div>
                      <span className={styles.badge}>
                        {remainingSpots(slot)}/{slot.spots_total} vagas
                      </span>
                    </div>
                  ))}
                </div>
                {workout?.attachment_url ? (
                  <a
                    className={styles.badge}
                    href={workout.attachment_url}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {workout.attachment_name || "Abrir anexo"}
                  </a>
                ) : null}
              </div>
            );
          })
        ) : (
          <p className={styles.emptyState}>
            Nao ha treinos publicados para esta semana.
          </p>
        )}
      </div>
    </div>
  );
}

function CommunityPanel({
  experience,
  participantsBySlot,
  slots,
}: {
  experience: ActivityExperience;
  participantsBySlot: Record<string, SlotParticipant[]>;
  slots: CompanySlot[];
}) {
  const upcomingWithPeople = slots.filter(
    (slot) => (participantsBySlot[slot.id] || []).length > 0,
  );

  return (
    <div className={styles.card}>
      <h2 className={styles.sectionTitle}>{experience.communityTitle}</h2>
      <div className={styles.tileGrid}>
        {upcomingWithPeople.length > 0 ? (
          upcomingWithPeople.map((slot) => (
            <div className={`${styles.tile} ${styles.weekRow}`} key={slot.id}>
              <div>
                <strong>{slot.services?.name || "Horario"}</strong>
                <p>{formatTime(slot.start_time)}</p>
              </div>
              <AvatarStack participants={participantsBySlot[slot.id] || []} />
            </div>
          ))
        ) : (
          <p className={styles.emptyState}>
            As fotos aparecem aqui quando houver {experience.participantLabel} confirmados.
          </p>
        )}
      </div>
    </div>
  );
}

function PromotionPanel() {
  return (
    <div className={styles.card}>
      <h2 className={styles.sectionTitle}>
        Profissionais, produtos e serviços
      </h2>
      <div className={`${styles.tileGrid} ${styles.tileGridTwo}`}>
        <div className={styles.tile}>
          <strong>Fisioterapia esportiva</strong>
          <p>Recuperação e prevenção para remadores.</p>
        </div>
        <div className={styles.tile}>
          <strong>Equipamentos e parceiros</strong>
          <p>Produtos, serviços e profissionais ligados ao clube.</p>
        </div>
      </div>
    </div>
  );
}
