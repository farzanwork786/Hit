-- Read-only activity snapshot for Hit. Changes nothing.
-- Paste into Supabase → SQL Editor → Run, then copy the result row.
select
  (select count(*) from auth.users)                                                     as users_total,
  (select count(*) from auth.users where created_at > now() - interval '7 days')        as users_new_7d,
  (select count(*) from auth.users where created_at > now() - interval '30 days')       as users_new_30d,
  (select count(*) from auth.users where last_sign_in_at > now() - interval '7 days')   as users_active_7d,
  (select count(*) from auth.users where last_sign_in_at > now() - interval '30 days')  as users_active_30d,
  (select count(*) from public.profiles where name is null or name = '')                as profiles_unfinished,
  (select count(*) from public.match_requests)                                          as requests_total,
  (select count(*) from public.match_requests where status = 'accepted')                as requests_accepted,
  (select count(*) from public.match_requests where status = 'pending')                 as requests_pending,
  (select count(*) from public.friendships)                                             as friendships,
  (select count(*) from public.conversations)                                           as chats,
  (select count(*) from public.messages)                                                as messages_total,
  (select count(*) from public.messages where created_at > now() - interval '7 days')   as messages_7d,
  (select count(distinct sender_id) from public.messages)                               as people_who_messaged,
  (select count(*) from public.scheduled_hits)                                          as hits_total,
  (select count(*) from public.scheduled_hits where status = 'accepted')                as hits_accepted,
  (select count(*) from public.scheduled_hits where status = 'proposed')                as hits_waiting,
  (select count(*) from public.scheduled_hits where status in ('declined','cancelled')) as hits_declined_cancelled,
  (select count(*) from public.court_posts)                                             as court_posts,
  (select count(*) from public.communities)                                             as communities,
  (select count(*) from public.community_members)                                       as community_memberships,
  (select count(*) from public.reports)                                                 as reports,
  (select count(*) from public.user_settings where push_token is not null)              as users_with_push,
  (select json_agg(w order by w.week) from (
     select date_trunc('week', created_at)::date as week, count(*) as signups
     from auth.users group by 1) w)                                                     as signups_by_week;
