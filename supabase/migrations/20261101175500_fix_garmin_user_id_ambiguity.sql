-- Avoid a PL/pgSQL variable/column name collision while resolving the athlete.
create or replace function public.ingest_garmin_activity(
  p_secret text,
  p_activity jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  expected_hash text;
  athlete_id uuid;
  activity_record_id uuid;
  garmin_user_id text;
  external_activity_id text;
  started_at_value timestamptz;
begin
  select config.secret_hash
  into expected_hash
  from private.garmin_webhook_config config
  where config.singleton = true;

  if p_secret is null
     or length(p_secret) < 32
     or encode(extensions.digest(p_secret, 'sha256'), 'hex') <> expected_hash then
    raise exception 'invalid Garmin webhook credential' using errcode = '42501';
  end if;

  garmin_user_id := nullif(p_activity->>'userId', '');
  external_activity_id := coalesce(
    nullif(p_activity->>'summaryId', ''),
    nullif(p_activity->>'activityId', '')
  );

  if garmin_user_id is null or external_activity_id is null then
    raise exception 'Garmin activity is missing userId or activityId';
  end if;

  select connection.user_id
  into athlete_id
  from public.athlete_provider_connections connection
  where connection.provider = 'garmin'
    and connection.status = 'connected'
    and connection.provider_user_id = garmin_user_id
  limit 1;

  if athlete_id is null then
    raise exception 'No connected BoraSport athlete matches Garmin user';
  end if;

  started_at_value := to_timestamp(
    coalesce(
      nullif(p_activity->>'startTimeInSeconds', '')::double precision,
      extract(epoch from now())
    )
  );

  insert into public.activity_records (
    user_id,
    company_id,
    provider,
    external_id,
    activity_type,
    title,
    started_at,
    duration_seconds,
    distance_meters,
    average_speed,
    max_speed,
    average_heart_rate,
    max_heart_rate,
    calories,
    elevation_gain_meters,
    metrics,
    source_payload,
    visibility
  )
  values (
    athlete_id,
    null,
    'garmin',
    external_activity_id,
    coalesce(nullif(p_activity->>'activityType', ''), 'paddling'),
    coalesce(
      nullif(p_activity->>'activityName', ''),
      nullif(p_activity->>'activityDescription', ''),
      'Atividade Garmin'
    ),
    started_at_value,
    nullif(p_activity->>'durationInSeconds', '')::integer,
    nullif(p_activity->>'distanceInMeters', '')::numeric,
    nullif(p_activity->>'averageSpeedInMetersPerSecond', '')::numeric,
    nullif(p_activity->>'maxSpeedInMetersPerSecond', '')::numeric,
    coalesce(
      nullif(p_activity->>'averageHeartRateInBeatsPerMinute', '')::integer,
      nullif(p_activity->>'averageHeartRate', '')::integer
    ),
    coalesce(
      nullif(p_activity->>'maxHeartRateInBeatsPerMinute', '')::integer,
      nullif(p_activity->>'maxHeartRate', '')::integer
    ),
    coalesce(
      nullif(p_activity->>'activeKilocalories', '')::integer,
      nullif(p_activity->>'calories', '')::integer
    ),
    coalesce(
      nullif(p_activity->>'totalElevationGainInMeters', '')::numeric,
      nullif(p_activity->>'elevationGainInMeters', '')::numeric
    ),
    jsonb_strip_nulls(jsonb_build_object(
      'startTimeOffsetInSeconds', p_activity->'startTimeOffsetInSeconds',
      'averagePaceInMinutesPerKilometer', p_activity->'averagePaceInMinutesPerKilometer',
      'averageBikeCadenceInRoundsPerMinute', p_activity->'averageBikeCadenceInRoundsPerMinute',
      'averageRunCadenceInStepsPerMinute', p_activity->'averageRunCadenceInStepsPerMinute',
      'deviceName', p_activity->'deviceName'
    )),
    p_activity,
    'private'
  )
  on conflict (provider, external_id, user_id)
  do update set
    source_payload = excluded.source_payload,
    updated_at = now()
  returning id into activity_record_id;

  return activity_record_id;
end;
$$;

revoke all on function public.ingest_garmin_activity(text, jsonb) from public, anon, authenticated;
grant execute on function public.ingest_garmin_activity(text, jsonb) to anon;

comment on function public.ingest_garmin_activity(text, jsonb) is
  'Private Garmin push ingestion boundary. Verifies the server webhook credential, maps Garmin userId to a connected athlete, and upserts idempotently.';
