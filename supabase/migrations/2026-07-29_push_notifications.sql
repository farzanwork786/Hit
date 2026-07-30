-- ============================================================
-- Real push notification delivery.
-- Run once in the Supabase SQL editor (Dashboard → SQL → New query).
-- Safe to re-run.
--
-- WHY THIS EXISTS
--   The app can obtain an Expo push token and store it, but a phone can't push
--   to another phone. Something server-side has to notice "a message was
--   inserted" and tell Expo to deliver it. These triggers do that, so the
--   RECIPIENT actually gets notified rather than the sender notifying himself.
--
-- WHAT IT DOES
--   On INSERT into messages       → push to the other conversation participant.
--   On INSERT into match_requests → push to the person being asked to play.
--   Respects the user's own notification toggles in user_settings.notifications
--   and silently does nothing when they have no push token stored.
-- ============================================================

-- pg_net lets Postgres make outbound HTTP calls (to Expo's push service).
create extension if not exists pg_net;

-- ---- Low-level sender ---------------------------------------
create or replace function public.send_expo_push(
  in_token text,
  in_title text,
  in_body  text,
  in_data  jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if in_token is null or in_token = '' then
    return;
  end if;

  perform net.http_post(
    url     := 'https://exp.host/--/api/v2/push/send',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body    := jsonb_build_object(
      'to',    in_token,
      'title', in_title,
      'body',  in_body,
      'sound', 'default',
      'data',  in_data
    )
  );
end;
$$;

-- ---- New message → notify the other participant --------------
create or replace function public.notify_on_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recipient   uuid;
  tok         text;
  prefs       jsonb;
  sender_name text;
begin
  select cp.user_id into recipient
  from public.conversation_participants cp
  where cp.conversation_id = new.conversation_id
    and cp.user_id <> new.sender_id
  limit 1;

  if recipient is null then return null; end if;

  select us.push_token, us.notifications
    into tok, prefs
  from public.user_settings us
  where us.user_id = recipient;

  if tok is null or tok = '' then return null; end if;
  if coalesce((prefs ->> 'push')::boolean, true) is not true then return null; end if;
  if coalesce((prefs ->> 'messages')::boolean, true) is not true then return null; end if;

  select p.name into sender_name from public.profiles p where p.id = new.sender_id;

  perform public.send_expo_push(
    tok,
    coalesce(nullif(sender_name, ''), 'New message'),
    left(coalesce(new.body, ''), 120),
    jsonb_build_object(
      'type', 'message',
      'conversationId', new.conversation_id,
      'playerId', new.sender_id
    )
  );
  return null;
end;
$$;

drop trigger if exists trg_notify_on_message on public.messages;
create trigger trg_notify_on_message
  after insert on public.messages
  for each row execute function public.notify_on_message();

-- ---- New play request → notify the recipient -----------------
create or replace function public.notify_on_match_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  tok         text;
  prefs       jsonb;
  sender_name text;
begin
  -- Only announce brand-new pending requests, not accept/decline updates.
  if new.status is distinct from 'pending' then return null; end if;

  select us.push_token, us.notifications
    into tok, prefs
  from public.user_settings us
  where us.user_id = new.to_user;

  if tok is null or tok = '' then return null; end if;
  if coalesce((prefs ->> 'push')::boolean, true) is not true then return null; end if;
  if coalesce((prefs ->> 'matchRequests')::boolean, true) is not true then return null; end if;

  select p.name into sender_name from public.profiles p where p.id = new.from_user;

  perform public.send_expo_push(
    tok,
    coalesce(nullif(sender_name, ''), 'Someone') || ' wants to play',
    left(coalesce(new.message, 'You have a new play request.'), 120),
    jsonb_build_object('type', 'match_request', 'playerId', new.from_user)
  );
  return null;
end;
$$;

drop trigger if exists trg_notify_on_match_request on public.match_requests;
create trigger trg_notify_on_match_request
  after insert on public.match_requests
  for each row execute function public.notify_on_match_request();

-- ============================================================
-- Done. Send yourself a message from a second account to test.
-- ============================================================
