-- ============================================================
-- Keep email, phone and precise location private.
-- Run once in the Supabase SQL editor (Dashboard → SQL → New query).
-- Safe to re-run. Safe for app builds already in people's hands.
--
-- WHY THIS EXISTS
--   profiles_select is `using (true)`, so every signed-in user could read
--   every column of every profile straight from the API — including email,
--   phone and the GPS lat/lng the app saves from the device. The anon key and
--   project URL ship inside the app, so anyone who signs up could download
--   all of it in one request.
--
-- WHAT IT DOES
--   1. Email and phone move to profile_private, which only the owner can read.
--      profiles.email / profiles.phone are always empty from now on: a trigger
--      moves any value written there (by the signup trigger or by older app
--      builds) into profile_private. Older builds keep working; they just see
--      blanks for other people.
--   2. get_my_private_profile(): the owner reads their own email, phone,
--      location and age.
--   3. Stored profile and court-post coordinates are rounded to 2 decimals
--      (~1 km), so nobody can be pinpointed at home — not from the columns,
--      and not by triangulating with distance search.
--
-- Later, once nearly everyone runs the new app build, supabase/pending/
-- lock_profile_columns.sql hides the rounded location and raw age too.
-- ============================================================

-- ---- 1. Owner-only email + phone ---------------------------
create table if not exists public.profile_private (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  email      text,
  phone      text,
  updated_at timestamptz default now()
);
alter table public.profile_private enable row level security;

drop policy if exists pp_select_own on public.profile_private;
create policy pp_select_own on public.profile_private for select to authenticated
  using (user_id = auth.uid());
-- No insert/update policies: only the trigger below writes here.

create or replace function public.profiles_move_private()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.email is not null or new.phone is not null then
    insert into public.profile_private (user_id, email, phone)
      values (new.id, new.email, new.phone)
    on conflict (user_id) do update set
      email = coalesce(excluded.email, profile_private.email),
      phone = coalesce(excluded.phone, profile_private.phone),
      updated_at = now();
    new.email := null;
    new.phone := null;
  end if;
  return new;
end; $$;

drop trigger if exists trg_profiles_move_private on public.profiles;
create trigger trg_profiles_move_private before insert or update
  on public.profiles for each row execute function public.profiles_move_private();

-- Move what's already there, then blank the public copies.
insert into public.profile_private (user_id, email, phone)
  select p.id, p.email, p.phone
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.email is not null or p.phone is not null
on conflict (user_id) do update set
  email = coalesce(excluded.email, profile_private.email),
  phone = coalesce(excluded.phone, profile_private.phone),
  updated_at = now();

update public.profiles set email = null, phone = null
where email is not null or phone is not null;

-- ---- 2. Owner-only read of private fields ------------------
drop function if exists public.get_my_private_profile();
create function public.get_my_private_profile()
returns table (email text, phone text, lat double precision, lng double precision, age int)
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(pp.email, u.email), pp.phone, p.lat, p.lng, p.age
  from public.profiles p
  join auth.users u on u.id = p.id
  left join public.profile_private pp on pp.user_id = p.id
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
-- Done. Check: select email, phone from public.profiles where email is not
-- null  → should return no rows.
-- ============================================================
