-- First security-hardening pass after the database audit.
-- This migration intentionally avoids onboarding policies and storage rules,
-- which require separate product-level validation.

-- Public views must evaluate permissions and RLS as the querying role.
alter view public.public_sport_profiles set (security_invoker = true);
alter view public.public_slot_participants set (security_invoker = true);

-- Pin the lookup path for functions flagged by the database advisor.
alter function public.is_authenticated() set search_path = public, auth;
alter function public.set_updated_at() set search_path = public;
alter function public.validate_booking_club_consistency() set search_path = public;
alter function public.prevent_overbooking() set search_path = public;
alter function public.auto_set_checked_in() set search_path = public;
alter function public.handle_new_club() set search_path = public, auth;

-- Trigger functions are internal implementation details, not Data API RPCs.
-- Revoking EXECUTE does not prevent PostgreSQL triggers from invoking them.
revoke execute on function public.auto_set_checked_in() from public, anon, authenticated;
revoke execute on function public.ensure_base_schedule_coach_membership() from public, anon, authenticated;
revoke execute on function public.ensure_base_schedule_existing_resources_not_conflicting() from public, anon, authenticated;
revoke execute on function public.ensure_base_schedule_resource_available() from public, anon, authenticated;
revoke execute on function public.ensure_operational_session_coach_membership() from public, anon, authenticated;
revoke execute on function public.ensure_operational_session_resource_available() from public, anon, authenticated;
revoke execute on function public.ensure_slot_capacity() from public, anon, authenticated;
revoke execute on function public.ensure_slot_professional_membership() from public, anon, authenticated;
revoke execute on function public.ensure_training_block_parent() from public, anon, authenticated;
revoke execute on function public.handle_new_club() from public, anon, authenticated;
revoke execute on function public.prevent_overbooking() from public, anon, authenticated;
revoke execute on function public.prevent_training_block_changes_when_locked() from public, anon, authenticated;
revoke execute on function public.protect_training_version_state() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.sync_slot_occupancy() from public, anon, authenticated;
revoke execute on function public.validate_booking_club_consistency() from public, anon, authenticated;
