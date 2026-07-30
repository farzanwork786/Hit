-- ============================================================
-- Real account deletion.
-- Run once in the Supabase SQL editor (Dashboard → SQL → New query).
-- Safe to re-run.
--
-- WHY THIS EXISTS
--   App Store Guideline 5.1.1(v) requires an app that lets people create an
--   account to also let them delete it from inside the app — and it has to
--   actually delete the account, not just sign out or deactivate.
--
--   The client can't do this itself: deleting an auth user needs privileges the
--   anon key deliberately doesn't have. This SECURITY DEFINER function runs with
--   the necessary rights but only ever deletes the CALLER's own account
--   (auth.uid()), so it can't be abused to delete anyone else.
--
-- WHAT IT REMOVES
--   auth.users row → cascades to profiles → cascades to all 20 dependent
--   tables (player_sports, match_requests, conversations, messages, court
--   posts, community memberships, notifications, blocks, settings, …), plus
--   the user's uploaded images in the `media` storage bucket.
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

  -- Uploaded avatars/covers/gallery photos live under "<user id>/..." in the
  -- media bucket. Storage isn't covered by the auth.users cascade, so clear it
  -- explicitly first.
  delete from storage.objects
  where bucket_id = 'media'
    and (name like me::text || '/%');

  -- Everything else hangs off auth.users by ON DELETE CASCADE.
  delete from auth.users where id = me;
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- ============================================================
-- Done. Verify with:
--   select proname from pg_proc where proname = 'delete_my_account';
-- ============================================================
