-- Hardening for the structured training engine.
-- Keeps published/archived versions immutable and checks both sides of block
-- moves so a locked version cannot be changed through a version_id update.

create or replace function public.prevent_training_block_changes_when_locked()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  old_version_status public.training_version_status;
  new_version_status public.training_version_status;
begin
  if tg_op in ('UPDATE', 'DELETE') then
    select status
    into old_version_status
    from public.training_plan_versions
    where id = old.training_plan_version_id;

    if old_version_status is null then
      raise exception 'training_version_not_found' using errcode = '23503';
    end if;

    if old_version_status <> 'draft' then
      raise exception 'training_version_locked' using errcode = '23514';
    end if;
  end if;

  if tg_op in ('INSERT', 'UPDATE') then
    select status
    into new_version_status
    from public.training_plan_versions
    where id = new.training_plan_version_id;

    if new_version_status is null then
      raise exception 'training_version_not_found' using errcode = '23503';
    end if;

    if new_version_status <> 'draft' then
      raise exception 'training_version_locked' using errcode = '23514';
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

create or replace function public.protect_training_version_state()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  simple_block_count integer;
begin
  if old.status in ('published', 'archived') then
    if new.id is distinct from old.id
       or new.company_id is distinct from old.company_id
       or new.training_plan_id is distinct from old.training_plan_id
       or new.version_number is distinct from old.version_number
       or new.level is distinct from old.level
       or new.duration_seconds is distinct from old.duration_seconds
       or new.technical_notes is distinct from old.technical_notes
       or new.safety_notes is distinct from old.safety_notes
       or new.created_by is distinct from old.created_by
       or new.created_at is distinct from old.created_at
       or new.published_at is distinct from old.published_at then
      raise exception 'published_training_version_is_immutable' using errcode = '23514';
    end if;

    if old.status = 'published' and new.status = 'draft' then
      raise exception 'published_training_version_cannot_return_to_draft' using errcode = '23514';
    end if;

    if old.status = 'archived' and new.status <> 'archived' then
      raise exception 'archived_training_version_is_immutable' using errcode = '23514';
    end if;
  end if;

  if new.status = 'published' and old.status <> 'published' then
    select count(*)::integer
    into simple_block_count
    from public.training_blocks
    where training_plan_version_id = new.id
      and block_kind = 'simple';

    if simple_block_count = 0 then
      raise exception 'published_training_version_requires_blocks' using errcode = '23514';
    end if;

    new.published_at := now();
  end if;

  return new;
end;
$$;
