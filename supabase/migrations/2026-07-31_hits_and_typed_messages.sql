alter table public.messages
  add column if not exists kind text not null default 'text';

alter table public.messages
  add column if not exists meta jsonb;

alter table public.messages drop constraint if exists messages_kind_check;
alter table public.messages
  add constraint messages_kind_check
  check (kind in ('text', 'court_ref', 'hit', 'system')) not valid;

alter table public.scheduled_hits
  add column if not exists court_post_id uuid
  references public.court_posts (id) on delete set null;

create index if not exists idx_scheduled_hits_proposer
  on public.scheduled_hits (proposer_id, scheduled_at);

create index if not exists idx_scheduled_hits_invitee
  on public.scheduled_hits (invitee_id, scheduled_at);

create index if not exists idx_scheduled_hits_post
  on public.scheduled_hits (court_post_id);

drop trigger if exists trg_scheduled_hits_updated on public.scheduled_hits;
create trigger trg_scheduled_hits_updated before update
  on public.scheduled_hits for each row execute function public.touch_updated_at();

create or replace function public.notify_on_scheduled_hit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target      uuid;
  tok         text;
  prefs       jsonb;
  actor_name  text;
  title_text  text;
begin
  if tg_op = 'INSERT' then
    target := new.invitee_id;
    select p.name into actor_name from public.profiles p where p.id = new.proposer_id;
    title_text := coalesce(nullif(actor_name, ''), 'Someone') || ' wants to hit';
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
    target := new.proposer_id;
    select p.name into actor_name from public.profiles p where p.id = new.invitee_id;
    if new.status = 'accepted' then
      title_text := coalesce(nullif(actor_name, ''), 'Someone') || ' is in';
    elsif new.status = 'declined' then
      title_text := coalesce(nullif(actor_name, ''), 'Someone') || ' can''t make it';
    elsif new.status = 'cancelled' then
      target := case when auth.uid() = new.proposer_id then new.invitee_id else new.proposer_id end;
      title_text := 'Hit cancelled';
    else
      return null;
    end if;
  else
    return null;
  end if;

  if target is null then return null; end if;

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

drop trigger if exists trg_notify_on_scheduled_hit on public.scheduled_hits;
create trigger trg_notify_on_scheduled_hit
  after insert or update on public.scheduled_hits
  for each row execute function public.notify_on_scheduled_hit();
