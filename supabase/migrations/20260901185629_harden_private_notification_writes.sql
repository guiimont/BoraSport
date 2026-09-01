-- Notifications are system-authored. Authenticated users may only read,
-- mark as read, or remove their own rows through RLS.

revoke insert on table public.user_notifications from authenticated;
