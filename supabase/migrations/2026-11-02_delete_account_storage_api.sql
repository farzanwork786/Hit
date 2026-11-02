-- ============================================================
-- Fix account deletion: stop deleting from storage.objects in SQL.
-- Run once in the Supabase SQL editor (Dashboard → SQL → New query).
-- Safe to re-run.
--
-- WHY THIS EXISTS
--   Supabase now guards storage.objects with a storage.protect_delete()
--   trigger that rejects direct SQL deletes ("Direct deletion from storage
--   tables is not allowed. Use the Storage API instead."). The original
--   delete_my_account() deleted the caller's photos that way, so it failed for
--   anyone who had uploaded a picture and the whole deletion rolled back.
--
--   The app now removes the user's files through the Storage API (allowed by
--   the media_delete policy) before calling this, and the function only
--   deletes the auth user — which cascades to profiles and every dependent
--   table, as before.
-- ============================================================

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then
    raise exception 'Not authenticated';
  end if;

  -- Everything hangs off auth.users by ON DELETE CASCADE.
  delete from auth.users where id = me;
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
