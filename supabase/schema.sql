-- ============================================================================
-- Hit — complete Supabase schema (tennis + pickleball matching app)
-- ----------------------------------------------------------------------------
-- Run this ENTIRE file once in the Supabase SQL editor
--   (Dashboard → SQL Editor → New query → paste → Run)
-- or via the CLI:  supabase db push   /   psql "$DATABASE_URL" -f schema.sql
--
-- It is idempotent: safe to re-run. It provisions every table the current app
-- uses, enables PostGIS for distance search, turns on Row Level Security with
-- per-user policies, wires triggers (profile bootstrap, friendships on accept,
-- notifications, denormalised counts) and creates the media storage bucket.
-- ============================================================================

-- ============================================================
-- Extensions
-- ============================================================
create extension if not exists "uuid-ossp" with schema extensions;
create extension if not exists postgis     with schema extensions;

-- ============================================================
-- Helper: updated_at touch trigger
-- ============================================================
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

-- ============================================================
-- profiles  (1:1 with auth.users)
-- ============================================================
create table if not exists public.profiles (
  id                     uuid primary key references auth.users (id) on delete cascade,
  email                  text,
  name                   text,
  username               text unique,
  phone                  text,
  age                    int,
  avatar                 text,   -- public URL
  cover                  text,   -- public URL
  photos                 text[]  default '{}',   -- gallery (max 6, enforced client-side)
  city                   text,
  lat                    double precision,
  lng                    double precision,
  location               extensions.geography(Point, 4326),  -- derived from lat/lng
  hand                   text default 'Right' check (hand in ('Right','Left')),
  bio                    text,
  availability           text[] default '{}',
  is_community           boolean default false,
  community_type         text,   -- 'Club' | 'Park' | 'Group' (community accounts)
  verified               boolean default false,
  friends_visibility     text default 'everyone' check (friends_visibility in ('everyone','friends','me')),
  communities_visibility text default 'everyone' check (communities_visibility in ('everyone','friends','me')),
  show_in_browse         boolean default true,
  created_at             timestamptz default now(),
  updated_at             timestamptz default now()
);

-- Keep the PostGIS point in sync with lat/lng on write.
create or replace function public.profiles_sync_location()
returns trigger language plpgsql as $$
begin
  if new.lat is not null and new.lng is not null then
    new.location = extensions.st_setsrid(extensions.st_makepoint(new.lng, new.lat), 4326)::extensions.geography;
  end if;
  return new;
end; $$;

drop trigger if exists trg_profiles_location on public.profiles;
create trigger trg_profiles_location before insert or update of lat, lng
  on public.profiles for each row execute function public.profiles_sync_location();

drop trigger if exists trg_profiles_updated on public.profiles;
create trigger trg_profiles_updated before update
  on public.profiles for each row execute function public.touch_updated_at();

create index if not exists idx_profiles_location on public.profiles using gist (location);

-- ============================================================
-- player_sports  (per-user, per-sport rating + style)
-- ============================================================
create table if not exists public.player_sports (
  id        uuid primary key default uuid_generate_v4(),
  user_id   uuid not null references public.profiles (id) on delete cascade,
  sport     text not null check (sport in ('tennis','pickleball')),
  rating    numeric(4,1),   -- UTR (tennis) or DUPR (pickleball); null = NR / not rated
  style     text,
  created_at timestamptz default now(),
  unique (user_id, sport)
);
create index if not exists idx_player_sports_user on public.player_sports (user_id);
create index if not exists idx_player_sports_sport on public.player_sports (sport);

-- ============================================================
-- user_settings  (privacy + notification prefs, per user)
-- mirrors the app's SettingsContext shape exactly
-- ============================================================
create table if not exists public.user_settings (
  user_id       uuid primary key references public.profiles (id) on delete cascade,
  privacy       jsonb default '{"profileVisibility":"everyone","whoCanMessage":"everyone","hideAge":false,"hideDistance":false,"showInBrowse":true}'::jsonb,
  notifications jsonb default '{"push":true,"matchRequests":true,"messages":true,"communityPosts":true,"courtBoardReplies":true,"appUpdates":true}'::jsonb,
  account       jsonb default '{"utrLinked":false,"duprLinked":false}'::jsonb,
  push_token    text,
  updated_at    timestamptz default now()
);
drop trigger if exists trg_user_settings_updated on public.user_settings;
create trigger trg_user_settings_updated before update
  on public.user_settings for each row execute function public.touch_updated_at();

-- ============================================================
-- blocks
-- ============================================================
create table if not exists public.blocks (
  id          uuid primary key default uuid_generate_v4(),
  blocker_id  uuid not null references public.profiles (id) on delete cascade,
  blocked_id  uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz default now(),
  unique (blocker_id, blocked_id)
);
create index if not exists idx_blocks_blocker on public.blocks (blocker_id);

-- ============================================================
-- reports  (players, posts, communities)
-- ============================================================
create table if not exists public.reports (
  id                   uuid primary key default uuid_generate_v4(),
  reporter_id          uuid not null references public.profiles (id) on delete cascade,
  reported_user_id     uuid references public.profiles (id) on delete cascade,
  reported_post_id     uuid,
  reported_community_id uuid,
  reason               text not null,
  details              text,
  status               text default 'open' check (status in ('open','reviewed','dismissed')),
  created_at           timestamptz default now()
);

-- ============================================================
-- match_requests  +  friendships
-- ============================================================
create table if not exists public.match_requests (
  id          uuid primary key default uuid_generate_v4(),
  from_user   uuid not null references public.profiles (id) on delete cascade,
  to_user     uuid not null references public.profiles (id) on delete cascade,
  message     text,
  status      text default 'pending' check (status in ('pending','accepted','declined')),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  unique (from_user, to_user)
);
create index if not exists idx_match_requests_to on public.match_requests (to_user, status);
create index if not exists idx_match_requests_from on public.match_requests (from_user, status);
drop trigger if exists trg_match_requests_updated on public.match_requests;
create trigger trg_match_requests_updated before update
  on public.match_requests for each row execute function public.touch_updated_at();

-- A friendship is a single canonical row (user_a < user_b) so it's symmetric.
create table if not exists public.friendships (
  id        uuid primary key default uuid_generate_v4(),
  user_a    uuid not null references public.profiles (id) on delete cascade,
  user_b    uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz default now(),
  check (user_a < user_b),
  unique (user_a, user_b)
);
create index if not exists idx_friendships_a on public.friendships (user_a);
create index if not exists idx_friendships_b on public.friendships (user_b);

-- ============================================================
-- conversations  +  participants  +  messages  (realtime)
-- ============================================================
create table if not exists public.conversations (
  id          uuid primary key default uuid_generate_v4(),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create table if not exists public.conversation_participants (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id         uuid not null references public.profiles (id) on delete cascade,
  last_read_at    timestamptz default now(),
  primary key (conversation_id, user_id)
);
create index if not exists idx_convp_user on public.conversation_participants (user_id);

create table if not exists public.messages (
  id              uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id       uuid not null references public.profiles (id) on delete cascade,
  body            text not null,
  created_at      timestamptz default now()
);
create index if not exists idx_messages_conv on public.messages (conversation_id, created_at);

-- ============================================================
-- court_posts  +  likes
-- ============================================================
create table if not exists public.court_posts (
  id          uuid primary key default uuid_generate_v4(),
  author_id   uuid not null references public.profiles (id) on delete cascade,
  sport       text not null check (sport in ('tennis','pickleball')),
  court       text,
  city        text,
  lat         double precision,
  lng         double precision,
  location    extensions.geography(Point, 4326),
  when_text   text,
  level       text,
  body        text not null,
  likes       int default 0,
  comments    int default 0,
  created_at  timestamptz default now()
);
create index if not exists idx_court_posts_sport on public.court_posts (sport, created_at desc);
create index if not exists idx_court_posts_location on public.court_posts using gist (location);

create or replace function public.court_posts_sync_location()
returns trigger language plpgsql as $$
begin
  if new.lat is not null and new.lng is not null then
    new.location = extensions.st_setsrid(extensions.st_makepoint(new.lng, new.lat), 4326)::extensions.geography;
  end if;
  return new;
end; $$;
drop trigger if exists trg_court_posts_location on public.court_posts;
create trigger trg_court_posts_location before insert or update of lat, lng
  on public.court_posts for each row execute function public.court_posts_sync_location();

create table if not exists public.court_post_likes (
  post_id  uuid not null references public.court_posts (id) on delete cascade,
  user_id  uuid not null references public.profiles (id) on delete cascade,
  primary key (post_id, user_id)
);

-- ============================================================
-- communities  +  members  +  posts  +  likes
-- ============================================================
create table if not exists public.communities (
  id           uuid primary key default uuid_generate_v4(),
  owner_id     uuid references public.profiles (id) on delete set null,
  name         text not null,
  photo        text,
  cover        text,
  description  text,
  city         text,
  lat          double precision,
  lng          double precision,
  location     extensions.geography(Point, 4326),
  sports       text[] default '{}',
  member_count int default 0,
  created_at   timestamptz default now()
);
create index if not exists idx_communities_location on public.communities using gist (location);

create or replace function public.communities_sync_location()
returns trigger language plpgsql as $$
begin
  if new.lat is not null and new.lng is not null then
    new.location = extensions.st_setsrid(extensions.st_makepoint(new.lng, new.lat), 4326)::extensions.geography;
  end if;
  return new;
end; $$;
drop trigger if exists trg_communities_location on public.communities;
create trigger trg_communities_location before insert or update of lat, lng
  on public.communities for each row execute function public.communities_sync_location();

create table if not exists public.community_members (
  community_id uuid not null references public.communities (id) on delete cascade,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  role         text default 'member' check (role in ('member','admin','owner')),
  joined_at    timestamptz default now(),
  primary key (community_id, user_id)
);
create index if not exists idx_community_members_user on public.community_members (user_id);

create table if not exists public.community_posts (
  id           uuid primary key default uuid_generate_v4(),
  community_id uuid not null references public.communities (id) on delete cascade,
  author_id    uuid references public.profiles (id) on delete set null,
  author_type  text default 'player' check (author_type in ('player','community')),
  body         text not null,
  pinned       boolean default false,
  likes        int default 0,
  created_at   timestamptz default now()
);
create index if not exists idx_community_posts_comm on public.community_posts (community_id, created_at desc);

create table if not exists public.community_post_likes (
  post_id  uuid not null references public.community_posts (id) on delete cascade,
  user_id  uuid not null references public.profiles (id) on delete cascade,
  primary key (post_id, user_id)
);

-- ============================================================
-- scheduled_hits
-- ============================================================
create table if not exists public.scheduled_hits (
  id           uuid primary key default uuid_generate_v4(),
  proposer_id  uuid not null references public.profiles (id) on delete cascade,
  invitee_id   uuid not null references public.profiles (id) on delete cascade,
  sport        text check (sport in ('tennis','pickleball')),
  court        text,
  city         text,
  scheduled_at timestamptz,
  note         text,
  status       text default 'proposed' check (status in ('proposed','accepted','declined','cancelled')),
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);
create index if not exists idx_scheduled_hits_invitee on public.scheduled_hits (invitee_id, status);
create index if not exists idx_scheduled_hits_proposer on public.scheduled_hits (proposer_id, status);
drop trigger if exists trg_scheduled_hits_updated on public.scheduled_hits;
create trigger trg_scheduled_hits_updated before update
  on public.scheduled_hits for each row execute function public.touch_updated_at();

-- ============================================================
-- notifications
-- ============================================================
create table if not exists public.notifications (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.profiles (id) on delete cascade,  -- recipient
  actor_id    uuid references public.profiles (id) on delete cascade,           -- who triggered it
  type        text not null,    -- 'request' | 'message' | 'match' | 'like' | 'community' | 'system'
  body        text,
  data        jsonb default '{}'::jsonb,
  read        boolean default false,
  created_at  timestamptz default now()
);
create index if not exists idx_notifications_user on public.notifications (user_id, read, created_at desc);

-- ============================================================
-- TRIGGERS — bootstrap, friendships, notifications, counts
-- ============================================================

-- New auth user → create profile shell + default settings.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email)
    values (new.id, new.email)
    on conflict (id) do nothing;
  insert into public.user_settings (user_id)
    values (new.id)
    on conflict (user_id) do nothing;
  return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Match request created → notify recipient.
create or replace function public.on_match_request_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications (user_id, actor_id, type, body, data)
    values (new.to_user, new.from_user, 'request', 'sent you a match request',
            jsonb_build_object('requestId', new.id));
  return new;
end; $$;
drop trigger if exists trg_match_request_insert on public.match_requests;
create trigger trg_match_request_insert after insert on public.match_requests
  for each row execute function public.on_match_request_insert();

-- Match request accepted → create friendship + notify requester.
create or replace function public.on_match_request_update()
returns trigger language plpgsql security definer set search_path = public as $$
declare a uuid; b uuid;
begin
  if new.status = 'accepted' and old.status <> 'accepted' then
    a := least(new.from_user, new.to_user);
    b := greatest(new.from_user, new.to_user);
    insert into public.friendships (user_a, user_b) values (a, b)
      on conflict (user_a, user_b) do nothing;
    insert into public.notifications (user_id, actor_id, type, body, data)
      values (new.from_user, new.to_user, 'match', 'accepted your match request',
              jsonb_build_object('requestId', new.id));
  end if;
  return new;
end; $$;
drop trigger if exists trg_match_request_update on public.match_requests;
create trigger trg_match_request_update after update on public.match_requests
  for each row execute function public.on_match_request_update();

-- Message inserted → bump conversation, notify the other participant(s).
create or replace function public.on_message_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.conversations set updated_at = now() where id = new.conversation_id;
  insert into public.notifications (user_id, actor_id, type, body, data)
    select cp.user_id, new.sender_id, 'message', 'sent you a message',
           jsonb_build_object('conversationId', new.conversation_id)
    from public.conversation_participants cp
    where cp.conversation_id = new.conversation_id
      and cp.user_id <> new.sender_id;
  return new;
end; $$;
drop trigger if exists trg_message_insert on public.messages;
create trigger trg_message_insert after insert on public.messages
  for each row execute function public.on_message_insert();

-- Community membership count maintenance.
create or replace function public.sync_community_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.communities set member_count = member_count + 1 where id = new.community_id;
  elsif tg_op = 'DELETE' then
    update public.communities set member_count = greatest(member_count - 1, 0) where id = old.community_id;
  end if;
  return null;
end; $$;
drop trigger if exists trg_community_member_count on public.community_members;
create trigger trg_community_member_count after insert or delete on public.community_members
  for each row execute function public.sync_community_count();

-- Court-post like count maintenance.
create or replace function public.sync_court_like_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.court_posts set likes = likes + 1 where id = new.post_id;
  elsif tg_op = 'DELETE' then
    update public.court_posts set likes = greatest(likes - 1, 0) where id = old.post_id;
  end if;
  return null;
end; $$;
drop trigger if exists trg_court_like_count on public.court_post_likes;
create trigger trg_court_like_count after insert or delete on public.court_post_likes
  for each row execute function public.sync_court_like_count();

-- Community-post like count maintenance.
create or replace function public.sync_comm_post_like_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.community_posts set likes = likes + 1 where id = new.post_id;
  elsif tg_op = 'DELETE' then
    update public.community_posts set likes = greatest(likes - 1, 0) where id = old.post_id;
  end if;
  return null;
end; $$;
drop trigger if exists trg_comm_post_like_count on public.community_post_likes;
create trigger trg_comm_post_like_count after insert or delete on public.community_post_likes
  for each row execute function public.sync_comm_post_like_count();

-- ============================================================
-- RPC: browse_players — PostGIS distance + sport + rating filter
-- Returns players within `radius_mi` of (in_lat,in_lng) who play `in_sport`,
-- excluding the caller, anyone the caller has blocked, anyone blocking the
-- caller, and anyone with show_in_browse = false.
-- ============================================================
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
      in_lat is null or in_lng is null or p.location is null
      or st_dwithin(p.location, st_setsrid(st_makepoint(in_lng, in_lat),4326)::geography, radius_mi * 1609.34)
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

-- Helper: is the caller a participant of conversation `cid`? SECURITY DEFINER
-- so it bypasses RLS and avoids infinite recursion in the participant policies.
create or replace function public.is_conv_participant(cid uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.conversation_participants
    where conversation_id = cid and user_id = auth.uid()
  );
$$;

-- RPC: start or fetch the 1:1 conversation between the caller and `other`.
create or replace function public.get_or_create_conversation(other uuid)
returns uuid
language plpgsql security definer set search_path = public as $$
declare conv uuid; me uuid := auth.uid();
begin
  select cp1.conversation_id into conv
  from public.conversation_participants cp1
  join public.conversation_participants cp2
    on cp1.conversation_id = cp2.conversation_id
  where cp1.user_id = me and cp2.user_id = other
  limit 1;

  if conv is null then
    insert into public.conversations default values returning id into conv;
    insert into public.conversation_participants (conversation_id, user_id)
      values (conv, me), (conv, other);
  end if;
  return conv;
end; $$;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.profiles                  enable row level security;
alter table public.player_sports             enable row level security;
alter table public.user_settings             enable row level security;
alter table public.blocks                    enable row level security;
alter table public.reports                   enable row level security;
alter table public.match_requests            enable row level security;
alter table public.friendships               enable row level security;
alter table public.conversations             enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages                  enable row level security;
alter table public.court_posts               enable row level security;
alter table public.court_post_likes          enable row level security;
alter table public.communities               enable row level security;
alter table public.community_members         enable row level security;
alter table public.community_posts           enable row level security;
alter table public.community_post_likes      enable row level security;
alter table public.scheduled_hits            enable row level security;
alter table public.notifications             enable row level security;

-- ---- profiles ----
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select
  to authenticated using (true);
drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles for insert
  to authenticated with check (id = auth.uid());
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update
  to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- ---- player_sports ----
drop policy if exists ps_select on public.player_sports;
create policy ps_select on public.player_sports for select to authenticated using (true);
drop policy if exists ps_write on public.player_sports;
create policy ps_write on public.player_sports for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---- user_settings ----
drop policy if exists us_all on public.user_settings;
create policy us_all on public.user_settings for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---- blocks ----
drop policy if exists blocks_all on public.blocks;
create policy blocks_all on public.blocks for all to authenticated
  using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());

-- ---- reports ----
drop policy if exists reports_insert on public.reports;
create policy reports_insert on public.reports for insert to authenticated
  with check (reporter_id = auth.uid());
drop policy if exists reports_select on public.reports;
create policy reports_select on public.reports for select to authenticated
  using (reporter_id = auth.uid());

-- ---- match_requests ----
drop policy if exists mr_select on public.match_requests;
create policy mr_select on public.match_requests for select to authenticated
  using (from_user = auth.uid() or to_user = auth.uid());
drop policy if exists mr_insert on public.match_requests;
create policy mr_insert on public.match_requests for insert to authenticated
  with check (from_user = auth.uid());
drop policy if exists mr_update on public.match_requests;
create policy mr_update on public.match_requests for update to authenticated
  using (from_user = auth.uid() or to_user = auth.uid());

-- ---- friendships ----
drop policy if exists fr_select on public.friendships;
create policy fr_select on public.friendships for select to authenticated
  using (user_a = auth.uid() or user_b = auth.uid());
-- (friendships are created by the accept trigger; no direct client insert)

-- ---- conversations ----
drop policy if exists conv_select on public.conversations;
create policy conv_select on public.conversations for select to authenticated
  using (public.is_conv_participant(id));

-- ---- conversation_participants ----
-- Uses the SECURITY DEFINER helper to avoid recursive RLS evaluation.
drop policy if exists convp_select on public.conversation_participants;
create policy convp_select on public.conversation_participants for select to authenticated
  using (public.is_conv_participant(conversation_id));
drop policy if exists convp_update on public.conversation_participants;
create policy convp_update on public.conversation_participants for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---- messages ----
drop policy if exists msg_select on public.messages;
create policy msg_select on public.messages for select to authenticated
  using (public.is_conv_participant(conversation_id));
drop policy if exists msg_insert on public.messages;
create policy msg_insert on public.messages for insert to authenticated
  with check (sender_id = auth.uid() and public.is_conv_participant(conversation_id));

-- ---- court_posts ----
drop policy if exists cp_select on public.court_posts;
create policy cp_select on public.court_posts for select to authenticated
  using (not exists (select 1 from public.blocks b
                     where (b.blocker_id = auth.uid() and b.blocked_id = author_id)
                        or (b.blocker_id = author_id and b.blocked_id = auth.uid())));
drop policy if exists cp_write on public.court_posts;
create policy cp_write on public.court_posts for all to authenticated
  using (author_id = auth.uid()) with check (author_id = auth.uid());

-- ---- court_post_likes ----
drop policy if exists cpl_select on public.court_post_likes;
create policy cpl_select on public.court_post_likes for select to authenticated using (true);
drop policy if exists cpl_write on public.court_post_likes;
create policy cpl_write on public.court_post_likes for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---- communities ----
drop policy if exists comm_select on public.communities;
create policy comm_select on public.communities for select to authenticated using (true);
drop policy if exists comm_write on public.communities;
create policy comm_write on public.communities for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- ---- community_members ----
drop policy if exists cm_select on public.community_members;
create policy cm_select on public.community_members for select to authenticated using (true);
drop policy if exists cm_write on public.community_members;
create policy cm_write on public.community_members for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---- community_posts ----
drop policy if exists comp_select on public.community_posts;
create policy comp_select on public.community_posts for select to authenticated using (true);
drop policy if exists comp_insert on public.community_posts;
create policy comp_insert on public.community_posts for insert to authenticated
  with check (author_id = auth.uid());
drop policy if exists comp_update on public.community_posts;
create policy comp_update on public.community_posts for update to authenticated
  using (author_id = auth.uid()) with check (author_id = auth.uid());
drop policy if exists comp_delete on public.community_posts;
create policy comp_delete on public.community_posts for delete to authenticated
  using (author_id = auth.uid());

-- ---- community_post_likes ----
drop policy if exists compl_select on public.community_post_likes;
create policy compl_select on public.community_post_likes for select to authenticated using (true);
drop policy if exists compl_write on public.community_post_likes;
create policy compl_write on public.community_post_likes for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---- scheduled_hits ----
drop policy if exists sh_select on public.scheduled_hits;
create policy sh_select on public.scheduled_hits for select to authenticated
  using (proposer_id = auth.uid() or invitee_id = auth.uid());
drop policy if exists sh_insert on public.scheduled_hits;
create policy sh_insert on public.scheduled_hits for insert to authenticated
  with check (proposer_id = auth.uid());
drop policy if exists sh_update on public.scheduled_hits;
create policy sh_update on public.scheduled_hits for update to authenticated
  using (proposer_id = auth.uid() or invitee_id = auth.uid());

-- ---- notifications ----
drop policy if exists notif_select on public.notifications;
create policy notif_select on public.notifications for select to authenticated
  using (user_id = auth.uid());
drop policy if exists notif_update on public.notifications;
create policy notif_update on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
-- (notifications are written by SECURITY DEFINER triggers, not directly by clients)

-- ============================================================
-- REALTIME — broadcast inserts/updates for live messaging & boards
-- ============================================================
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end $$;

do $$
declare t text;
begin
  foreach t in array array['messages','match_requests','notifications','court_posts','community_posts','scheduled_hits']
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- ============================================================
-- STORAGE — public "media" bucket for avatars / covers / gallery.
-- Each user can write only inside a folder named with their own uid.
-- ============================================================
insert into storage.buckets (id, name, public)
  values ('media', 'media', true)
  on conflict (id) do nothing;

drop policy if exists media_read on storage.objects;
create policy media_read on storage.objects for select
  using (bucket_id = 'media');

drop policy if exists media_insert on storage.objects;
create policy media_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists media_update on storage.objects;
create policy media_update on storage.objects for update to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists media_delete on storage.objects;
create policy media_delete on storage.objects for delete to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================================
-- Done. Provisioned: profiles, player_sports, user_settings, blocks,
-- reports, match_requests, friendships, conversations, messages,
-- court_posts (+likes), communities (+members, posts, likes),
-- scheduled_hits, notifications — with RLS, triggers, PostGIS browse,
-- realtime and the media storage bucket.
-- ============================================================
