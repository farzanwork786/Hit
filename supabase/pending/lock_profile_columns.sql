-- ============================================================
-- LATER: lock profile columns to the public set.
-- Run ONLY once nearly everyone is on the app build that reads age_public
-- (the build after 1.0.1). Older builds select age/lat/lng/email/phone
-- directly and will fail to load profiles after this runs.
-- Requires both 2026-11-02 migrations. Safe to re-run.
--
-- After this, other players can't read anyone's rounded location or real
-- age (age_public respects "Hide my age"). Owners read theirs through
-- get_my_private_profile(). A column added to profiles later must be added
-- to this list to be readable by the app.
-- ============================================================
revoke select on public.profiles from anon, authenticated;
grant select (
  id, name, username, age_public, avatar, cover, photos, city, hand, bio,
  availability, is_community, community_type, verified,
  friends_visibility, communities_visibility, show_in_browse,
  created_at, updated_at
) on public.profiles to authenticated;
