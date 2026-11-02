-- ============================================================
-- Safety rules, privacy enforcement, and engagement housekeeping.
-- Run AFTER 2026-11-02_private_profile_fields.sql, in the Supabase SQL
-- editor (Dashboard → SQL → New query). Safe to re-run.
--
-- WHAT IT DOES
--   1. Blocking actually blocks: no new requests, hits, chats or messages
--      between two people when either has blocked the other.
--   2. Privacy settings are enforced: "Who can see my profile" (Browse),
--      "Who can message me" (new chats), "Hide my age", "Hide my distance".
--   3. Nobody can grant themselves things: verified badge, accepting their own
--      request or hit, community owner role, pinned/official community posts.
--   4. Fixes "I'm in" on a Court Board post, which never created the hit
--      (the insert rule only allowed the proposer to insert).
--   5. Photos can't be listed by outsiders any more (public links still work).
--   6. send_expo_push can no longer be called from the app's API.
--   7. Reports notify the admins (app_admins) in-app and by push.
--   8. Hit invites and responses now show in the in-app Notifications list.
--   9. Server-side limits: 18+ age, text lengths, max 6 gallery photos.
--  10. Missing indexes.
--  11. Daily job: nudge people sitting on a play request, expire requests
--      after 14 days, clear old read notifications.
-- ============================================================

-- ============================================================
-- Helpers
-- ============================================================
create or replace function public.is_blocked_between(a uuid, b uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.blocks
    where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a)
  );
$$;

create or replace function public.are_friends(a uuid, b uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.friendships
    where user_a = least(a, b) and user_b = greatest(a, b)
  );
$$;

-- One key of a user's privacy settings, with a default when unset.
create or replace function public.privacy_setting(uid uuid, key text, fallback text)
returns text
language sql stable security definer set search_path = public as $$
  select coalesce((select us.privacy ->> key from public.user_settings us where us.user_id = uid), fallback);
$$;

-- is_blocked_between is used inside RLS policies, so signed-in users need it.
-- The other two reveal private data and are only for server-side functions.
revoke all on function public.is_blocked_between(uuid, uuid) from public, anon;
grant execute on function public.is_blocked_between(uuid, uuid) to authenticated;
revoke all on function public.are_friends(uuid, uuid) from public, anon, authenticated;
revoke all on function public.privacy_setting(uuid, text, text) from public, anon, authenticated;

-- ============================================================
-- 1. Blocking
-- ============================================================
drop policy if exists mr_insert on public.match_requests;
create policy mr_insert on public.match_requests for insert to authenticated
  with check (
    from_user = auth.uid()
    and from_user <> to_user
    and coalesce(status, 'pending') = 'pending'
    and not public.is_blocked_between(from_user, to_user)
  );

drop policy if exists msg_insert on public.messages;
create policy msg_insert on public.messages for insert to authenticated
  with check (
    sender_id = auth.uid()
    and public.is_conv_participant(conversation_id)
    and not exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = messages.conversation_id
        and cp.user_id <> auth.uid()
        and public.is_blocked_between(auth.uid(), cp.user_id)
    )
  );

-- Hits: the proposer asks (always starts as 'proposed'), or a player joins
-- someone's Court Board post, which inserts the hit with the post's author as
-- proposer and the joiner as an already-accepted invitee. (4. — the old rule
-- only allowed the first case, so "I'm in" silently failed.)
drop policy if exists sh_insert on public.scheduled_hits;
create policy sh_insert on public.scheduled_hits for insert to authenticated
  with check (
    proposer_id <> invitee_id
    and not public.is_blocked_between(proposer_id, invitee_id)
    and (
      (proposer_id = auth.uid() and coalesce(status, 'proposed') = 'proposed')
      or (
        invitee_id = auth.uid()
        and scheduled_hits.court_post_id is not null
        and exists (
          select 1 from public.court_posts cp
          where cp.id = scheduled_hits.court_post_id and cp.author_id = scheduled_hits.proposer_id
        )
      )
    )
  );

-- New chats: blocked → never. "Who can message me" = 'nobody' / 'matches'
-- → only friends, or someone replying to a request or hit the other person
-- started. Existing conversations keep working (blocking still applies via
-- the message rule above).
create or replace function public.get_or_create_conversation(other uuid, in_sport text default null)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  conv uuid;
  me uuid := auth.uid();
  wcm text;
begin
  if me is null or other is null or other = me then
    raise exception 'Invalid conversation' using errcode = 'P0001';
  end if;
  if public.is_blocked_between(me, other) then
    raise exception 'You can''t message this player.' using errcode = 'P0001';
  end if;

  select c.id into conv
  from public.conversations c
  join public.conversation_participants cp1 on cp1.conversation_id = c.id and cp1.user_id = me
  join public.conversation_participants cp2 on cp2.conversation_id = c.id and cp2.user_id = other
  where in_sport is null or c.sport is null or c.sport = in_sport
  order by (c.sport is not distinct from in_sport) desc
  limit 1;

  if conv is null then
    wcm := public.privacy_setting(other, 'whoCanMessage', 'everyone');
    if wcm in ('nobody', 'matches')
       and not (wcm = 'matches' and public.are_friends(me, other))
       and not exists (select 1 from public.match_requests r where r.from_user = other and r.to_user = me)
       and not exists (select 1 from public.scheduled_hits h where h.proposer_id = other and h.invitee_id = me)
    then
      raise exception 'This player only takes messages from people they''ve connected with. Send a play request instead.'
        using errcode = 'P0001';
    end if;
    insert into public.conversations (sport) values (in_sport) returning id into conv;
    insert into public.conversation_participants (conversation_id, user_id)
      values (conv, me), (conv, other);
  elsif in_sport is not null then
    update public.conversations set sport = in_sport where id = conv and sport is null;
  end if;
  return conv;
end; $$;

revoke all on function public.get_or_create_conversation(uuid, text) from public, anon;
grant execute on function public.get_or_create_conversation(uuid, text) to authenticated;

-- ============================================================
-- 2. Privacy: hide age, hide distance, profile visibility
-- ============================================================
-- hide_age mirrors user_settings.privacy.hideAge; age_public is what other
-- users can read. The owner reads their real age via get_my_private_profile.
alter table public.profiles add column if not exists hide_age boolean not null default false;
alter table public.profiles add column if not exists age_public int
  generated always as (case when hide_age then null else age end) stored;

create or replace function public.sync_privacy_to_profile()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.profiles
     set hide_age = coalesce((new.privacy ->> 'hideAge')::boolean, false)
   where id = new.user_id
     and hide_age is distinct from coalesce((new.privacy ->> 'hideAge')::boolean, false);
  return null;
end; $$;

drop trigger if exists trg_sync_privacy_to_profile on public.user_settings;
create trigger trg_sync_privacy_to_profile after insert or update of privacy
  on public.user_settings for each row execute function public.sync_privacy_to_profile();

update public.profiles p
   set hide_age = coalesce((us.privacy ->> 'hideAge')::boolean, false)
  from public.user_settings us
 where us.user_id = p.id
   and p.hide_age is distinct from coalesce((us.privacy ->> 'hideAge')::boolean, false);

-- Readable columns: the public set, with age replaced by age_public.
revoke select on public.profiles from anon, authenticated;
grant select (
  id, name, username, age_public, avatar, cover, photos, city, hand, bio,
  availability, is_community, community_type, verified,
  friends_visibility, communities_visibility, show_in_browse,
  created_at, updated_at
) on public.profiles to authenticated;

drop function if exists public.get_my_private_profile();
create function public.get_my_private_profile()
returns table (email text, phone text, lat double precision, lng double precision, age int)
language sql stable security definer set search_path = public as $$
  select p.email, p.phone, p.lat, p.lng, p.age from public.profiles p where p.id = auth.uid();
$$;
revoke all on function public.get_my_private_profile() from public, anon;
grant execute on function public.get_my_private_profile() to authenticated;

-- Browse respects profileVisibility, hideAge and hideDistance.
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
  select p.id, p.name, p.username,
         case when coalesce((us.privacy ->> 'hideAge')::boolean, false) then null else p.age end,
         p.avatar, p.cover, p.photos,
         p.city, p.hand, p.bio, p.availability, p.verified,
         case when coalesce((us.privacy ->> 'hideDistance')::boolean, false) then null
              when p.location is not null and in_lat is not null and in_lng is not null
              then st_distance(p.location,
                     st_setsrid(st_makepoint(in_lng, in_lat),4326)::geography) / 1609.34
              else null end as distance_mi,
         ps.rating, ps.style
  from public.profiles p
  join public.player_sports ps on ps.user_id = p.id and ps.sport = in_sport
  left join public.user_settings us on us.user_id = p.id
  cross join me
  where me.uid is not null
    and p.id <> me.uid
    and coalesce(p.show_in_browse, true) = true
    and coalesce(p.is_community, false) = false
    and coalesce(us.privacy ->> 'profileVisibility', 'everyone') <> 'nobody'
    and (coalesce(us.privacy ->> 'profileVisibility', 'everyone') <> 'matches'
         or public.are_friends(me.uid, p.id))
    and not public.is_blocked_between(me.uid, p.id)
    and (
      in_lat is null or in_lng is null
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
  -- Nearest first, even for players who hide the number.
  order by case when p.location is not null and in_lat is not null and in_lng is not null
                then st_distance(p.location, st_setsrid(st_makepoint(in_lng, in_lat),4326)::geography)
           end nulls last
  limit 200;
$$;

revoke all on function public.browse_players(text, double precision, double precision, double precision, double precision, double precision, boolean) from public, anon;
grant execute on function public.browse_players(text, double precision, double precision, double precision, double precision, double precision, boolean) to authenticated;

-- ============================================================
-- 3. Nobody grants themselves anything
-- ============================================================
-- Guards only apply to requests from the app (roles anon/authenticated).
-- The dashboard, triggers and the daily job run as other roles and skip them.

create or replace function public.guard_profile_write()
returns trigger language plpgsql as $$
begin
  if current_user in ('anon', 'authenticated') then
    if tg_op = 'INSERT' then
      new.verified := false;
    else
      new.verified := old.verified;
    end if;
  end if;
  return new;
end; $$;

drop trigger if exists trg_guard_profile_write on public.profiles;
create trigger trg_guard_profile_write before insert or update
  on public.profiles for each row execute function public.guard_profile_write();

-- Requests: only the recipient answers; the sender can only (re)send.
create or replace function public.guard_match_request_update()
returns trigger language plpgsql as $$
begin
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;
  if new.from_user <> old.from_user or new.to_user <> old.to_user then
    raise exception 'A request can''t be moved to other people.' using errcode = 'P0001';
  end if;
  if new.status is distinct from old.status then
    if auth.uid() = old.to_user then
      if new.status not in ('accepted', 'declined') then
        raise exception 'You can only accept or decline this request.' using errcode = 'P0001';
      end if;
    elsif auth.uid() = old.from_user then
      if new.status <> 'pending' then
        raise exception 'Only the other player can answer your request.' using errcode = 'P0001';
      end if;
      if public.is_blocked_between(old.from_user, old.to_user) then
        raise exception 'You can''t send a request to this player.' using errcode = 'P0001';
      end if;
      -- A re-sent request is a fresh request for reminders and expiry.
      new.created_at := now();
      new.reminded_at := null;
    end if;
  end if;
  return new;
end; $$;

-- Hits: only the invited player accepts or declines; either side can cancel
-- or reschedule; nobody re-points a hit at different people.
create or replace function public.guard_scheduled_hit_update()
returns trigger language plpgsql as $$
begin
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;
  if new.proposer_id <> old.proposer_id
     or new.invitee_id <> old.invitee_id
     or new.court_post_id is distinct from old.court_post_id then
    raise exception 'A hit can''t be moved to other people.' using errcode = 'P0001';
  end if;
  if new.status is distinct from old.status
     and new.status in ('accepted', 'declined')
     and auth.uid() is distinct from old.invitee_id then
    raise exception 'Only the invited player can accept or decline.' using errcode = 'P0001';
  end if;
  return new;
end; $$;

drop trigger if exists trg_guard_scheduled_hit_update on public.scheduled_hits;
create trigger trg_guard_scheduled_hit_update before update
  on public.scheduled_hits for each row execute function public.guard_scheduled_hit_update();

-- Community membership: join as a member and leave; roles come from the owner.
drop policy if exists cm_write on public.community_members;
drop policy if exists cm_insert on public.community_members;
drop policy if exists cm_delete on public.community_members;
create policy cm_insert on public.community_members for insert to authenticated
  with check (
    user_id = auth.uid()
    and (
      coalesce(role, 'member') = 'member'
      or exists (select 1 from public.communities c
                 where c.id = community_members.community_id and c.owner_id = auth.uid())
    )
  );
create policy cm_delete on public.community_members for delete to authenticated
  using (user_id = auth.uid());

-- Community posts: members post as themselves; only the community's owner can
-- pin or post as the community.
drop policy if exists comp_insert on public.community_posts;
create policy comp_insert on public.community_posts for insert to authenticated
  with check (
    author_id = auth.uid()
    and (
      exists (select 1 from public.communities c
              where c.id = community_posts.community_id and c.owner_id = auth.uid())
      or (
        coalesce(pinned, false) = false
        and coalesce(author_type, 'player') = 'player'
        and exists (select 1 from public.community_members m
                    where m.community_id = community_posts.community_id and m.user_id = auth.uid())
      )
    )
  );
drop policy if exists comp_update on public.community_posts;
create policy comp_update on public.community_posts for update to authenticated
  using (author_id = auth.uid())
  with check (
    author_id = auth.uid()
    and (
      exists (select 1 from public.communities c
              where c.id = community_posts.community_id and c.owner_id = auth.uid())
      or (coalesce(pinned, false) = false and coalesce(author_type, 'player') = 'player')
    )
  );

-- ============================================================
-- 5. Storage: no listing other people's folders
-- ============================================================
-- The bucket is public, so photo links keep working without a read policy.
-- Owners can still list their own folder (account deletion needs that).
drop policy if exists media_read on storage.objects;
drop policy if exists media_read_own on storage.objects;
create policy media_read_own on storage.objects for select to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================================
-- 6. Push sender is server-only
-- ============================================================
revoke all on function public.send_expo_push(text, text, text, jsonb) from public, anon, authenticated;

-- ============================================================
-- 7. Reports reach the admins
-- ============================================================
create table if not exists public.app_admins (
  user_id uuid primary key references public.profiles (id) on delete cascade
);
alter table public.app_admins enable row level security;  -- no policies: invisible to the app

-- Add more admins the same way, by their sign-in email.
insert into public.app_admins (user_id)
  select u.id from auth.users u
  join public.profiles p on p.id = u.id
  where u.email = 'farzanwork786@gmail.com'
on conflict do nothing;

create or replace function public.notify_admins_on_report()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  a record;
  reported_name text;
  summary text;
begin
  select p.name into reported_name from public.profiles p where p.id = new.reported_user_id;
  summary := 'New report: ' || new.reason
             || coalesce(' — ' || nullif(reported_name, ''), '');
  for a in
    select ad.user_id, us.push_token
    from public.app_admins ad
    left join public.user_settings us on us.user_id = ad.user_id
  loop
    insert into public.notifications (user_id, actor_id, type, body, data)
      values (a.user_id, new.reported_user_id, 'system', summary,
              jsonb_build_object('reportId', new.id));
    perform public.send_expo_push(a.push_token, 'New report', summary,
                                  jsonb_build_object('type', 'report', 'reportId', new.id));
  end loop;
  return null;
end; $$;

drop trigger if exists trg_notify_admins_on_report on public.reports;
create trigger trg_notify_admins_on_report after insert on public.reports
  for each row execute function public.notify_admins_on_report();

-- ============================================================
-- 8. Hits show up in Notifications (and a Court Board join tells the author)
-- ============================================================
create or replace function public.notify_on_scheduled_hit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target      uuid;
  actor       uuid;
  tok         text;
  prefs       jsonb;
  actor_name  text;
  title_text  text;
  note_text   text;
begin
  if tg_op = 'INSERT' then
    if new.status = 'accepted' and new.court_post_id is not null then
      -- Someone tapped I'm in on a Court Board post.
      target := new.proposer_id;
      actor  := new.invitee_id;
      select p.name into actor_name from public.profiles p where p.id = actor;
      title_text := coalesce(nullif(actor_name, ''), 'Someone') || ' is in';
      note_text  := 'is in for your Court Board session';
    else
      target := new.invitee_id;
      actor  := new.proposer_id;
      select p.name into actor_name from public.profiles p where p.id = actor;
      title_text := coalesce(nullif(actor_name, ''), 'Someone') || ' wants to hit';
      note_text  := 'asked you to hit';
    end if;
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
    target := new.proposer_id;
    actor  := new.invitee_id;
    select p.name into actor_name from public.profiles p where p.id = actor;
    if new.status = 'accepted' then
      title_text := coalesce(nullif(actor_name, ''), 'Someone') || ' is in';
      note_text  := 'accepted your hit';
    elsif new.status = 'declined' then
      title_text := coalesce(nullif(actor_name, ''), 'Someone') || ' can''t make it';
      note_text  := 'can''t make your hit';
    elsif new.status = 'cancelled' then
      if auth.uid() = new.proposer_id then
        target := new.invitee_id;
        actor  := new.proposer_id;
      end if;
      title_text := 'Hit cancelled';
      note_text  := 'cancelled the hit';
    else
      return null;
    end if;
  else
    return null;
  end if;

  if target is null then return null; end if;

  insert into public.notifications (user_id, actor_id, type, body, data)
    values (target, actor, 'hit', note_text, jsonb_build_object('hitId', new.id));

  select us.push_token, us.notifications
    into tok, prefs
  from public.user_settings us
  where us.user_id = target;

  if tok is null or tok = '' then return null; end if;
  if coalesce((prefs ->> 'push')::boolean, true) is not true then return null; end if;

  perform public.send_expo_push(
    tok,
    title_text,
    coalesce(new.court, 'Tap to see the details'),
    jsonb_build_object('type', 'hit', 'hitId', new.id)
  );
  return null;
end;
$$;

-- ============================================================
-- 9. Server-side limits (NOT VALID: existing rows are left alone)
-- ============================================================
alter table public.profiles drop constraint if exists hit_profiles_age;
alter table public.profiles add constraint hit_profiles_age
  check (age is null or (age >= 18 and age < 120)) not valid;
alter table public.profiles drop constraint if exists hit_profiles_name_len;
alter table public.profiles add constraint hit_profiles_name_len
  check (name is null or char_length(name) <= 100) not valid;
alter table public.profiles drop constraint if exists hit_profiles_bio_len;
alter table public.profiles add constraint hit_profiles_bio_len
  check (bio is null or char_length(bio) <= 2000) not valid;
alter table public.profiles drop constraint if exists hit_profiles_photos_max;
alter table public.profiles add constraint hit_profiles_photos_max
  check (photos is null or cardinality(photos) <= 6) not valid;
alter table public.messages drop constraint if exists hit_messages_body_len;
alter table public.messages add constraint hit_messages_body_len
  check (char_length(body) <= 4000) not valid;
alter table public.court_posts drop constraint if exists hit_court_posts_body_len;
alter table public.court_posts add constraint hit_court_posts_body_len
  check (char_length(body) <= 2000) not valid;
alter table public.community_posts drop constraint if exists hit_community_posts_body_len;
alter table public.community_posts add constraint hit_community_posts_body_len
  check (char_length(body) <= 4000) not valid;
alter table public.match_requests drop constraint if exists hit_match_requests_message_len;
alter table public.match_requests add constraint hit_match_requests_message_len
  check (message is null or char_length(message) <= 1000) not valid;
alter table public.scheduled_hits drop constraint if exists hit_scheduled_hits_note_len;
alter table public.scheduled_hits add constraint hit_scheduled_hits_note_len
  check (note is null or char_length(note) <= 2000) not valid;
alter table public.reports drop constraint if exists hit_reports_details_len;
alter table public.reports add constraint hit_reports_details_len
  check (details is null or char_length(details) <= 2000) not valid;

-- ============================================================
-- 10. Indexes
-- ============================================================
create index if not exists idx_blocks_blocked on public.blocks (blocked_id);
create index if not exists idx_messages_sender on public.messages (sender_id);
create index if not exists idx_notifications_actor on public.notifications (actor_id);
create index if not exists idx_court_post_likes_user on public.court_post_likes (user_id);
create index if not exists idx_community_post_likes_user on public.community_post_likes (user_id);
create index if not exists idx_court_posts_author on public.court_posts (author_id);
create index if not exists idx_match_requests_pending on public.match_requests (status, created_at);

-- ============================================================
-- 11. Request reminders + expiry, notification cleanup (daily)
-- ============================================================
alter table public.match_requests add column if not exists reminded_at timestamptz;
alter table public.match_requests drop constraint if exists match_requests_status_check;
alter table public.match_requests add constraint match_requests_status_check
  check (status in ('pending', 'accepted', 'declined', 'expired'));

-- The request guard references reminded_at, so attach it after the column exists.
drop trigger if exists trg_guard_match_request_update on public.match_requests;
create trigger trg_guard_match_request_update before update
  on public.match_requests for each row execute function public.guard_match_request_update();

create or replace function public.run_daily_housekeeping()
returns void language plpgsql security definer set search_path = public as $$
declare
  r           record;
  tok         text;
  prefs       jsonb;
  sender_name text;
begin
  -- Nudge anyone who's left a play request unanswered for 2+ days (once).
  for r in
    select id, from_user, to_user from public.match_requests
    where status = 'pending' and reminded_at is null
      and created_at < now() - interval '2 days'
      and created_at > now() - interval '14 days'
  loop
    update public.match_requests set reminded_at = now() where id = r.id;
    select us.push_token, us.notifications into tok, prefs
      from public.user_settings us where us.user_id = r.to_user;
    if tok is not null and tok <> ''
       and coalesce((prefs ->> 'push')::boolean, true)
       and coalesce((prefs ->> 'matchRequests')::boolean, true) then
      select p.name into sender_name from public.profiles p where p.id = r.from_user;
      perform public.send_expo_push(
        tok,
        coalesce(nullif(sender_name, ''), 'Someone') || ' is waiting to hear back',
        'Tap to reply to their play request.',
        jsonb_build_object('type', 'match_request', 'playerId', r.from_user)
      );
    end if;
  end loop;

  -- Requests nobody answered in two weeks stop cluttering Requests.
  update public.match_requests set status = 'expired'
  where status = 'pending' and created_at < now() - interval '14 days';

  -- Old read notifications.
  delete from public.notifications where read and created_at < now() - interval '90 days';
end; $$;

revoke all on function public.run_daily_housekeeping() from public, anon, authenticated;

create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;

select cron.unschedule(jobid) from cron.job where jobname = 'hit-daily-housekeeping';
-- 17:00 UTC = 9–10am in California.
select cron.schedule('hit-daily-housekeeping', '0 17 * * *', 'select public.run_daily_housekeeping();');

-- ============================================================
-- Done.
-- ============================================================
