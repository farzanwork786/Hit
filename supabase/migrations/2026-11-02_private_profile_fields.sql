-- ============================================================
-- Keep email, phone and precise location private.
-- Run once in the Supabase SQL editor (Dashboard → SQL → New query).
-- Safe to re-run.
--
-- WHY THIS EXISTS
--   profiles_select is `using (true)`, so every signed-in user could read
--   every column of every profile straight from the API — including email,
--   phone and the GPS lat/lng the app saves from the device. The anon key and
--   project URL ship inside the app, so anyone who signs up could download
--   all of it in one request.
--
-- WHAT IT DOES
--   1. Column privileges: other users can read only the public profile
--      columns. email, phone, lat, lng and location are no longer readable
--      through the API by anyone.
--   2. get_my_private_profile(): the owner reads their own private fields.
--   3. Stored profile and court-post coordinates are rounded to 2 decimals
--      (~1 km), so distance search can't be used to triangulate someone's home.
--
-- NOTE: any column added to profiles later is NOT readable by the app until
-- it is added to the grant list below.
-- ============================================================

-- ---- 1. Column-level read access ---------------------------
revoke select on public.profiles from anon, authenticated;
grant select (
  id, name, username, age, avatar, cover, photos, city, hand, bio,
  availability, is_community, community_type, verified,
  friends_visibility, communities_visibility, show_in_browse,
  created_at, updated_at
) on public.profiles to authenticated;

-- ---- 2. Owner-only read of private fields ------------------
create or replace function public.get_my_private_profile()
returns table (email text, phone text, lat double precision, lng double precision)
language sql
stable
security definer
set search_path = public
as $$
  select p.email, p.phone, p.lat, p.lng
  from public.profiles p
  where p.id = auth.uid();
$$;

revoke all on function public.get_my_private_profile() from public, anon;
grant execute on function public.get_my_private_profile() to authenticated;

-- ---- 3. Coarse location (~1 km) ----------------------------
create or replace function public.profiles_sync_location()
returns trigger language plpgsql as $$
begin
  if new.lat is not null and new.lng is not null then
    new.lat = round(new.lat::numeric, 2)::double precision;
    new.lng = round(new.lng::numeric, 2)::double precision;
    new.location = extensions.st_setsrid(extensions.st_makepoint(new.lng, new.lat), 4326)::extensions.geography;
  end if;
  return new;
end; $$;

-- Court posts are stamped with the poster's own location, and everyone can
-- read them, so they get the same ~1 km rounding.
create or replace function public.court_posts_sync_location()
returns trigger language plpgsql as $$
begin
  if new.lat is not null and new.lng is not null then
    new.lat = round(new.lat::numeric, 2)::double precision;
    new.lng = round(new.lng::numeric, 2)::double precision;
    new.location = extensions.st_setsrid(extensions.st_makepoint(new.lng, new.lat), 4326)::extensions.geography;
  end if;
  return new;
end; $$;

-- Re-save existing coordinates so the triggers round them.
update public.profiles set lat = lat, lng = lng
where lat is not null and lng is not null;
update public.court_posts set lat = lat, lng = lng
where lat is not null and lng is not null;

-- ============================================================
-- Done. Check: as a signed-in user, selecting email from another
-- profile should now fail with "permission denied".
-- ============================================================
