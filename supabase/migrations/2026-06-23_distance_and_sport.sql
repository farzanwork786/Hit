-- ============================================================
-- Migration: strict distance radius + sport-tagged messaging
-- Run this once in the Supabase SQL editor (Dashboard → SQL → New query).
-- It is idempotent — safe to run more than once.
--
-- What it changes:
--   1. browse_players  — STRICT radius (no longer returns location-less
--      players to everyone), so a far-away account stops showing up.
--   2. match_requests.sport / conversations.sport columns + a sport-aware
--      get_or_create_conversation, so Chats & Requests can be filtered by
--      tennis vs pickleball.
--
-- NOTE: existing accounts only become discoverable once they have a
-- location. New sign-ups now geocode their city to lat/lng automatically.
-- To backfill old rows you can re-save their city, or set profiles.lat/lng
-- directly (the trigger derives the PostGIS point from lat/lng).
-- ============================================================

-- ---- 1. Strict distance radius -----------------------------
create or replace function public.browse_players(
  in_sport   text,
  in_lat     double precision,
  in_lng     double precision,
  radius_mi  double precision default 25,
  min_rating double precision default null,
  max_rating double precision default null,
  include_nr boolean default true
)
returns table (
  id uuid, name text, username text, age int, avatar text, cover text,
  photos text[], city text, hand text, bio text, availability text[],
  verified boolean, distance_mi double precision,
  rating numeric, style text
)
language sql stable security definer set search_path = public, extensions as $$
  with me as (select auth.uid() as uid)
  select p.id, p.name, p.username, p.age, p.avatar, p.cover, p.photos,
         p.city, p.hand, p.bio, p.availability, p.verified,
         case when p.location is not null and in_lat is not null and in_lng is not null
              then st_distance(p.location,
                     st_setsrid(st_makepoint(in_lng, in_lat),4326)::geography) / 1609.34
              else null end as distance_mi,
         ps.rating, ps.style
  from public.profiles p
  join public.player_sports ps on ps.user_id = p.id and ps.sport = in_sport
  cross join me
  where p.id <> me.uid
    and coalesce(p.show_in_browse, true) = true
    and coalesce(p.is_community, false) = false
    and not exists (select 1 from public.blocks b
                    where (b.blocker_id = me.uid and b.blocked_id = p.id)
                       or (b.blocker_id = p.id and b.blocked_id = me.uid))
    and (
      -- Searcher has no coordinates yet → can't filter by distance, show everyone.
      in_lat is null or in_lng is null
      -- Otherwise enforce a STRICT radius (Hinge/Tinder style): the candidate
      -- must have a known location AND be within the radius.
      or (p.location is not null
          and st_dwithin(p.location, st_setsrid(st_makepoint(in_lng, in_lat),4326)::geography, radius_mi * 1609.34))
    )
    and (
      (ps.rating is null and include_nr)
      or (min_rating is null and max_rating is null)
      or (ps.rating is not null
          and (min_rating is null or ps.rating >= min_rating)
          and (max_rating is null or ps.rating <= max_rating))
    )
  order by distance_mi nulls last
  limit 200;
$$;

-- ---- 2. Sport-tagged messaging -----------------------------
alter table public.match_requests
  add column if not exists sport text;
alter table public.conversations
  add column if not exists sport text;

-- Constrain to known sports (drop-then-add so a re-run stays clean).
alter table public.match_requests drop constraint if exists match_requests_sport_check;
alter table public.match_requests
  add constraint match_requests_sport_check check (sport in ('tennis','pickleball')) not valid;
alter table public.conversations drop constraint if exists conversations_sport_check;
alter table public.conversations
  add constraint conversations_sport_check check (sport in ('tennis','pickleball')) not valid;

-- Sport-aware 1:1 conversation lookup/creation. Threads are per (pair, sport);
-- an older untagged thread is reused and tagged on first sport-scoped use.
create or replace function public.get_or_create_conversation(other uuid, in_sport text default null)
returns uuid
language plpgsql security definer set search_path = public as $$
declare conv uuid; me uuid := auth.uid();
begin
  select c.id into conv
  from public.conversations c
  join public.conversation_participants cp1 on cp1.conversation_id = c.id and cp1.user_id = me
  join public.conversation_participants cp2 on cp2.conversation_id = c.id and cp2.user_id = other
  where in_sport is null or c.sport is null or c.sport = in_sport
  order by (c.sport is not distinct from in_sport) desc  -- prefer an exact sport match
  limit 1;

  if conv is null then
    insert into public.conversations (sport) values (in_sport) returning id into conv;
    insert into public.conversation_participants (conversation_id, user_id)
      values (conv, me), (conv, other);
  elsif in_sport is not null then
    update public.conversations set sport = in_sport where id = conv and sport is null;
  end if;
  return conv;
end; $$;

-- The signature changed (added in_sport), so drop the old single-arg version
-- if it lingers, to avoid an ambiguous overload.
drop function if exists public.get_or_create_conversation(uuid);

-- ============================================================
-- Done.
-- ============================================================
