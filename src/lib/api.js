// Central data-access layer.
//
// Every screen talks to Supabase through these functions instead of importing
// mock data directly. Writes succeed silently in demo mode and surface real
// permission/validation errors when live.
//
// IMPORTANT — demo data never leaks into a live app. Mock content is returned
// ONLY when Supabase is unconfigured (`DEMO`), i.e. someone running the app with
// no .env credentials. When credentials exist we are a real app for real users:
// a failed or empty read returns nothing, so the UI shows a genuine empty state
// instead of inventing players, chats, requests or friends.
//
// Shapes returned here match what the screens already expect (e.g. a player has
// `sports: { tennis: { rating, style }, pickleball: { rating, style } }`,
// where `rating` is the self-reported Skill Level or null when not set).

import * as Location from 'expo-location';
import {
  supabase,
  isSupabaseConfigured,
  shouldTryLive,
  markUnreachable,
  markReachable,
  isNetworkError,
} from './supabase';
import { SPORTS, SPORT_KEYS } from './ratings';
import * as mock from './mockData';

// Demo mode = no Supabase credentials at all. This is the ONLY situation in
// which any function here may return mock data.
const DEMO = !isSupabaseConfigured;

// Mock content for demo mode; an empty result for a real, live app.
function demoOnly(mockData, empty = []) {
  return DEMO ? mockData() : empty;
}

// Forward-geocode a "City, Region" label into { lat, lng }. No permission
// needed. Returns null if the geocoder is unavailable or finds no match.
async function geocodeLabel(label) {
  if (!label) return null;
  try {
    const [g] = await Location.geocodeAsync(label);
    if (g && g.latitude != null && g.longitude != null) {
      return { lat: g.latitude, lng: g.longitude };
    }
  } catch (e) {
    // geocoder unavailable / no match
  }
  return null;
}

// A URI that still points at the local device rather than a hosted URL.
export const isLocalUri = (u) =>
  typeof u === 'string' &&
  (u.startsWith('file:') ||
    u.startsWith('content:') ||
    u.startsWith('ph:') ||
    u.startsWith('assets-library:'));

// Haversine distance in miles between two { lat, lng } points.
function milesBetween(a, b) {
  if (!a || !b || a.lat == null || a.lng == null || b.lat == null || b.lng == null) return null;
  const R = 3958.8; // Earth radius in miles
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------
export function timeAgo(iso) {
  if (!iso) return 'now';
  const secs = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (secs < 60) return 'now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return `${Math.floor(days / 7)}w`;
}

export function clockTime(iso) {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
}

async function currentUid() {
  if (!isSupabaseConfigured) return null;
  const { data } = await supabase.auth.getSession();
  return data?.session?.user?.id ?? null;
}

// Public accessor for the signed-in user's id (null in demo mode).
export async function getCurrentUserId() {
  return currentUid();
}

// Read a list. In demo mode this falls back to mock content; in a live app a
// failed or empty read returns [] so the UI shows a real empty state.
// `fallbackOnEmpty` only has an effect in demo mode.
async function readList({ live, mockData, fallbackOnEmpty = false }) {
  if (!shouldTryLive()) return demoOnly(mockData);
  try {
    const { data, error } = await live();
    if (error) {
      if (isNetworkError(error)) markUnreachable();
      return demoOnly(mockData);
    }
    markReachable();
    if ((!data || data.length === 0) && fallbackOnEmpty) return demoOnly(mockData, data || []);
    return data || [];
  } catch (e) {
    markUnreachable();
    return demoOnly(mockData);
  }
}

// Write that tolerates demo mode but surfaces genuine errors.
async function write(live) {
  if (!shouldTryLive()) return { ok: true, demo: true };
  try {
    const { data, error } = await live();
    if (error) {
      if (isNetworkError(error)) {
        markUnreachable();
        return { ok: true, demo: true };
      }
      return { ok: false, error };
    }
    markReachable();
    return { ok: true, data };
  } catch (e) {
    markUnreachable();
    return { ok: true, demo: true };
  }
}

// ---------------------------------------------------------------------------
// Mapping: DB rows <-> app shapes
// ---------------------------------------------------------------------------
const PROFILE_COLS =
  'id,name,username,email,phone,age,avatar,cover,photos,city,lat,lng,hand,bio,availability,is_community,community_type,verified,friends_visibility,communities_visibility,show_in_browse';

function sportsFromRows(rows = []) {
  const out = {};
  for (const r of rows) {
    const meta = SPORTS[r.sport];
    if (!meta) continue;
    out[r.sport] = { [meta.ratingKey]: r.rating, style: r.style };
  }
  return out;
}

function dbProfileToApp(row, sportsRows) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    username: row.username,
    email: row.email,
    phone: row.phone,
    age: row.age,
    avatar: row.avatar,
    cover: row.cover,
    photos: row.photos || [],
    city: row.city,
    lat: row.lat,
    lng: row.lng,
    hand: row.hand || 'Right',
    bio: row.bio,
    availability: row.availability || [],
    isCommunity: row.is_community,
    communityType: row.community_type,
    verified: row.verified,
    friendsVisibility: row.friends_visibility || 'everyone',
    communitiesVisibility: row.communities_visibility || 'everyone',
    sports: sportsFromRows(sportsRows),
  };
}

// browse_players RPC row → player card shape (single sport).
function browseRowToPlayer(row, sport) {
  const meta = SPORTS[sport];
  return {
    id: row.id,
    name: row.name,
    username: row.username,
    age: row.age,
    avatar: row.avatar,
    cover: row.cover,
    photos: row.photos || [],
    city: row.city,
    hand: row.hand || 'Right',
    bio: row.bio,
    availability: row.availability || [],
    verified: row.verified,
    distance: row.distance_mi != null ? Math.round(row.distance_mi * 10) / 10 : null,
    sports: { [sport]: { [meta.ratingKey]: row.rating, style: row.style } },
  };
}

// Convert app sports object → player_sports rows for upsert.
function appSportsToRows(userId, sportsObj = {}) {
  const rows = [];
  for (const key of SPORT_KEYS) {
    const entry = sportsObj[key];
    if (!entry) continue;
    rows.push({
      user_id: userId,
      sport: key,
      rating: entry[SPORTS[key].ratingKey] ?? null,
      style: entry.style ?? null,
    });
  }
  return rows;
}

// ===========================================================================
// PROFILES  +  BROWSE
// ===========================================================================
export async function getProfile(id) {
  if (!shouldTryLive()) return demoOnly(() => mock.getPlayer(id), null);
  try {
    const [{ data: row, error }, { data: sportsRows }] = await Promise.all([
      supabase.from('profiles').select(PROFILE_COLS).eq('id', id).single(),
      supabase.from('player_sports').select('sport,rating,style').eq('user_id', id),
    ]);
    if (error) {
      if (isNetworkError(error)) markUnreachable();
      return demoOnly(() => mock.getPlayer(id), null);
    }
    markReachable();
    return dbProfileToApp(row, sportsRows);
  } catch (e) {
    markUnreachable();
    return demoOnly(() => mock.getPlayer(id), null);
  }
}

// Persist profile fields + per-sport ratings. Returns { ok, error }.
export async function saveProfile(userId, patch) {
  if (!shouldTryLive() || !userId) return { ok: true, demo: true };
  const profilePatch = {};
  const map = {
    name: 'name', username: 'username', phone: 'phone', age: 'age',
    avatar: 'avatar', cover: 'cover', photos: 'photos', city: 'city',
    lat: 'lat', lng: 'lng', hand: 'hand', bio: 'bio', availability: 'availability',
    verified: 'verified',
    isCommunity: 'is_community', communityType: 'community_type',
    friendsVisibility: 'friends_visibility', communitiesVisibility: 'communities_visibility',
  };
  for (const [appKey, col] of Object.entries(map)) {
    if (patch[appKey] !== undefined) profilePatch[col] = patch[appKey];
  }

  // Photos picked during registration are still local device URIs at this point
  // (there was no user id to upload them under yet). Upload any local URI to
  // Storage and save the resulting public URL, otherwise the profile would hold
  // a file:// path that no other device can load.
  if (isLocalUri(profilePatch.avatar)) {
    const { url } = await uploadImage(userId, profilePatch.avatar, 'avatar');
    if (url) profilePatch.avatar = url;
  }
  if (isLocalUri(profilePatch.cover)) {
    const { url } = await uploadImage(userId, profilePatch.cover, 'cover');
    if (url) profilePatch.cover = url;
  }
  if (Array.isArray(profilePatch.photos)) {
    profilePatch.photos = await Promise.all(
      profilePatch.photos.map(async (p) => {
        if (!isLocalUri(p)) return p;
        const { url } = await uploadImage(userId, p, 'photo');
        return url || p;
      })
    );
  }

  // When a city is being saved without explicit coordinates (registration, or
  // changing your city in Edit Profile), geocode it so the profile gets lat/lng.
  // The DB trigger then derives the PostGIS `location` point, which is what makes
  // the account discoverable within the correct radius. (Precise GPS writes pass
  // lat/lng directly and skip this.)
  if (profilePatch.city && profilePatch.lat == null && profilePatch.lng == null) {
    const coords = await geocodeLabel(profilePatch.city);
    if (coords) {
      profilePatch.lat = coords.lat;
      profilePatch.lng = coords.lng;
    }
  }

  return write(async () => {
    if (Object.keys(profilePatch).length) {
      const { error } = await supabase
        .from('profiles')
        .upsert({ id: userId, ...profilePatch });
      if (error) return { error };
    }
    if (patch.sports) {
      const rows = appSportsToRows(userId, patch.sports);
      if (rows.length) {
        const { error } = await supabase
          .from('player_sports')
          .upsert(rows, { onConflict: 'user_id,sport' });
        if (error) return { error };
      }
    }
    return { data: true };
  });
}

// Browse players: live via PostGIS RPC, else filtered mock.
export async function browsePlayers({ sport, lat, lng, radius = 25, min = null, max = null, includeNr = true }) {
  const mockData = () => {
    const blocked = mock.blockedIds;
    return mock.players
      .filter((p) => p.sports?.[sport])
      .filter((p) => !blocked.has(p.id))
      .filter((p) => (radius ? p.distance <= radius : true))
      .map((p) => ({ ...p }));
  };

  if (!shouldTryLive()) return demoOnly(mockData);
  try {
    const { data, error } = await supabase.rpc('browse_players', {
      in_sport: sport,
      in_lat: lat ?? null,
      in_lng: lng ?? null,
      radius_mi: radius ?? 25,
      min_rating: min,
      max_rating: max,
      include_nr: includeNr,
    });
    if (error) {
      if (isNetworkError(error)) markUnreachable();
      return demoOnly(mockData);
    }
    markReachable();
    // NOTE: when live + reachable we return the real (PostGIS-filtered) result
    // as-is — even when empty. We deliberately do NOT fall back to mock players
    // here, because mock players carry static distances and would let someone
    // far away (e.g. Boston) appear for a user elsewhere (e.g. San Jose),
    // breaking real distance filtering. An empty real result shows the friendly
    // "no players near you" empty state instead.
    return (data || []).map((row) => browseRowToPlayer(row, sport));
  } catch (e) {
    markUnreachable();
    return demoOnly(mockData);
  }
}

// ===========================================================================
// MATCH REQUESTS  +  FRIENDS
// ===========================================================================
export async function sendMatchRequest(toUserId, message, sport = null) {
  return write(async () => {
    const uid = await currentUid();
    return supabase
      .from('match_requests')
      .upsert(
        { from_user: uid, to_user: toUserId, message, sport, status: 'pending' },
        { onConflict: 'from_user,to_user' }
      );
  });
}

export async function getIncomingRequests() {
  return readList({
    fallbackOnEmpty: false,
    mockData: () =>
      mock.requests.map((r) => ({ id: r.id, player: r.player, message: r.message, time: r.time, sport: r.sport ?? null })),
    live: async () => {
      const uid = await currentUid();
      const { data, error } = await supabase
        .from('match_requests')
        .select('id,message,sport,created_at,from_user,profiles!match_requests_from_user_fkey(' + PROFILE_COLS + ')')
        .eq('to_user', uid)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (error) return { data, error };
      return {
        data: (data || []).map((r) => ({
          id: r.id,
          player: dbProfileToApp(r.profiles, []),
          message: r.message,
          sport: r.sport ?? null,
          time: timeAgo(r.created_at),
        })),
      };
    },
  });
}

export async function acceptRequest(id) {
  return write(() => supabase.from('match_requests').update({ status: 'accepted' }).eq('id', id));
}

// Promote any pending request FROM `fromUserId` to me. Replying to someone is
// an implicit accept, so their thread moves out of Requests and into Chats.
// A no-op when there's no pending request.
export async function acceptRequestFrom(fromUserId) {
  if (!fromUserId) return { ok: true };
  return write(async () => {
    const uid = await currentUid();
    return supabase
      .from('match_requests')
      .update({ status: 'accepted' })
      .eq('from_user', fromUserId)
      .eq('to_user', uid)
      .eq('status', 'pending');
  });
}
export async function declineRequest(id) {
  return write(() => supabase.from('match_requests').update({ status: 'declined' }).eq('id', id));
}

export async function getFriends(userId) {
  return readList({
    fallbackOnEmpty: false,
    mockData: () => mock.getFriends(mock.getPlayer(userId) || mock.currentUser),
    live: async () => {
      const { data, error } = await supabase
        .from('friendships')
        .select('user_a,user_b')
        .or(`user_a.eq.${userId},user_b.eq.${userId}`);
      if (error) return { data, error };
      const ids = (data || []).map((f) => (f.user_a === userId ? f.user_b : f.user_a));
      if (!ids.length) return { data: [] };
      const { data: profiles, error: e2 } = await supabase
        .from('profiles')
        .select(PROFILE_COLS)
        .in('id', ids);
      if (e2) return { data: null, error: e2 };
      return { data: (profiles || []).map((p) => dbProfileToApp(p, [])) };
    },
  });
}

// ===========================================================================
// MESSAGING  (conversations + messages + realtime)
// ===========================================================================
export async function getConversations() {
  return readList({
    fallbackOnEmpty: false,
    mockData: () =>
      mock.chats.map((c) => ({
        id: c.id,
        player: c.player,
        lastMessage: c.lastMessage,
        time: c.time,
        unread: c.unread,
        sport: c.sport ?? null,
      })),
    live: async () => {
      const uid = await currentUid();
      const { data: parts, error } = await supabase
        .from('conversation_participants')
        .select('conversation_id,last_read_at,conversations(sport)')
        .eq('user_id', uid);
      if (error) return { data: null, error };
      const convIds = (parts || []).map((p) => p.conversation_id);
      if (!convIds.length) return { data: [] };
      const sportByConv = Object.fromEntries(
        (parts || []).map((p) => [p.conversation_id, p.conversations?.sport ?? null])
      );

      // Other participant per conversation.
      const { data: others } = await supabase
        .from('conversation_participants')
        .select('conversation_id,user_id,profiles(' + PROFILE_COLS + ')')
        .in('conversation_id', convIds)
        .neq('user_id', uid);

      // Latest message per conversation (fetch recent, reduce client-side).
      const { data: msgs } = await supabase
        .from('messages')
        .select('conversation_id,body,created_at,sender_id')
        .in('conversation_id', convIds)
        .order('created_at', { ascending: false });

      const lastByConv = {};
      for (const m of msgs || []) {
        if (!lastByConv[m.conversation_id]) lastByConv[m.conversation_id] = m;
      }
      const readByConv = Object.fromEntries((parts || []).map((p) => [p.conversation_id, p.last_read_at]));
      const otherByConv = {};
      for (const o of others || []) otherByConv[o.conversation_id] = o.profiles;

      const chats = convIds
        .map((cid) => {
          const last = lastByConv[cid];
          const lastReadAt = readByConv[cid];
          const unread =
            last && last.sender_id !== uid && (!lastReadAt || new Date(last.created_at) > new Date(lastReadAt))
              ? 1
              : 0;
          return {
            id: cid,
            player: dbProfileToApp(otherByConv[cid], []),
            lastMessage: last?.body || 'Say hi 👋',
            time: last ? timeAgo(last.created_at) : '',
            unread,
            sport: sportByConv[cid] ?? null,
            _sortAt: last?.created_at || '',
          };
        })
        .filter((c) => c.player)
        .sort((a, b) => (a._sortAt < b._sortAt ? 1 : -1));
      return { data: chats };
    },
  });
}

export async function getOrCreateConversation(otherId, sport = null) {
  if (!shouldTryLive()) return { ok: true, demo: true, id: null };
  try {
    const { data, error } = await supabase.rpc('get_or_create_conversation', {
      other: otherId,
      in_sport: sport,
    });
    if (error) {
      if (isNetworkError(error)) markUnreachable();
      return { ok: false, error };
    }
    markReachable();
    return { ok: true, id: data };
  } catch (e) {
    markUnreachable();
    return { ok: false, error: e };
  }
}

export async function getMessages(conversationId) {
  if (!conversationId) return [];
  return readList({
    fallbackOnEmpty: false,
    mockData: () => (mock.messagesByChat[conversationId] || []),
    live: async () => {
      const uid = await currentUid();
      const { data, error } = await supabase
        .from('messages')
        .select('id,body,sender_id,created_at,kind,meta')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      if (error) return { data, error };
      return {
        data: (data || []).map((m) => ({
          id: m.id,
          text: m.body,
          fromMe: m.sender_id === uid,
          time: clockTime(m.created_at),
          // 'text' | 'court_ref' | 'hit' | 'system' — decides how the chat
          // renders this row. Older rows have no kind and are plain text.
          kind: m.kind || 'text',
          meta: m.meta || null,
        })),
      };
    },
  });
}

// Send a message. `kind` + `meta` turn it into a reference card, a hit
// proposal, or a system event; `body` is always set so conversation previews
// and push notifications have readable text regardless of kind.
export async function sendMessage(conversationId, body, { kind = 'text', meta = null } = {}) {
  return write(async () => {
    const uid = await currentUid();
    return supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: uid,
      body,
      kind,
      meta,
    });
  });
}

export async function markConversationRead(conversationId) {
  if (!shouldTryLive() || !conversationId) return;
  try {
    const uid = await currentUid();
    await supabase
      .from('conversation_participants')
      .update({ last_read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .eq('user_id', uid);
  } catch (e) {
    /* ignore */
  }
}

// Subscribe to new messages in a conversation. Returns an unsubscribe fn.
export function subscribeMessages(conversationId, onInsert) {
  if (!isSupabaseConfigured || !conversationId) return () => {};
  const channel = supabase
    .channel(`messages:${conversationId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
      (payload) => onInsert(payload.new)
    )
    .subscribe();
  return () => supabase.removeChannel(channel);
}

// ===========================================================================
// COURT BOARD
// ===========================================================================
export async function getCourtPosts({ sport, lat = null, lng = null, maxDistance = 50 }) {
  const origin = lat != null && lng != null ? { lat, lng } : null;
  const uid = await currentUid();

  const mockData = () =>
    mock.courtPosts
      .filter((p) => p.sport === sport && p.distance <= maxDistance)
      .map((p) => ({ ...p }));

  if (!shouldTryLive()) return demoOnly(mockData);
  try {
    const { data, error } = await supabase
      .from('court_posts')
      // The FK name is REQUIRED here. profiles is reachable from court_posts two
      // ways — directly via author_id, and many-to-many via court_post_likes —
      // so an unqualified embed is ambiguous and PostgREST rejects the whole
      // query (PGRST201), which silently emptied the entire Court Board.
      .select('*,author:profiles!court_posts_author_id_fkey(' + PROFILE_COLS + ')')
      .eq('sport', sport)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) {
      if (isNetworkError(error)) markUnreachable();
      return demoOnly(mockData);
    }
    markReachable();

    const posts = (data || []).map((p) => {
      // Distance from the active (Browse) location to the post's location.
      const dist = origin ? milesBetween(origin, { lat: p.lat, lng: p.lng }) : null;
      return {
        id: p.id,
        sport: p.sport,
        authorId: p.author_id,
        author: dbProfileToApp(p.author, []),
        court: p.court,
        city: p.city,
        distance: dist != null ? Math.round(dist * 10) / 10 : null,
        when: p.when_text,
        level: p.level,
        text: p.body,
        likes: p.likes || 0,
        comments: p.comments || 0,
        timeAgo: timeAgo(p.created_at),
      };
    });

    // Distance filter. Unlike browsePlayers we do NOT drop posts with an
    // unknown location: a post whose author had no resolved coordinates would
    // otherwise be invisible to everyone (including its own author) forever.
    // Better to show it without a distance than to silently swallow it.
    // Your own posts always show, however far away you've since moved.
    if (!origin) return posts;
    return posts.filter(
      (p) =>
        (uid && p.authorId === uid) ||
        p.distance == null ||
        p.distance <= maxDistance
    );
  } catch (e) {
    markUnreachable();
    return demoOnly(mockData);
  }
}

export async function createCourtPost(draft) {
  return write(async () => {
    const uid = await currentUid();
    return supabase
      .from('court_posts')
      .insert({
        author_id: uid,
        sport: draft.sport,
        court: draft.court,
        city: draft.city,
        lat: draft.lat ?? null,
        lng: draft.lng ?? null,
        when_text: draft.when,
        level: draft.level,
        body: draft.text,
      })
      .select('id')
      .single();
  });
}

// Edit an existing court post (author-only, enforced by RLS).
export async function updateCourtPost(id, draft) {
  return write(() =>
    supabase
      .from('court_posts')
      .update({
        court: draft.court,
        city: draft.city,
        when_text: draft.when,
        level: draft.level,
        body: draft.text,
      })
      .eq('id', id)
  );
}

// Delete a court post (author-only, enforced by RLS).
export async function deleteCourtPost(id) {
  return write(() => supabase.from('court_posts').delete().eq('id', id));
}

// ===========================================================================
// COMMUNITIES
// ===========================================================================
// Communities for a sport. `lat`/`lng` (the active Browse location) are used to
// show a real distance and to order nearest-first — results are NOT filtered by
// distance, so a community is never hidden just for being far away.
export async function getCommunities(sport, { lat = null, lng = null } = {}) {
  const origin = lat != null && lng != null ? { lat, lng } : null;

  // Nearest first when we know where the user is; otherwise biggest first.
  const sortByDistance = (list) =>
    origin
      ? [...list].sort((a, b) => {
          if (a.distance == null && b.distance == null) return 0;
          if (a.distance == null) return 1; // unknown location sinks to the end
          if (b.distance == null) return -1;
          return a.distance - b.distance;
        })
      : list;

  return readList({
    fallbackOnEmpty: true,
    mockData: () =>
      sortByDistance(mock.communities.filter((c) => c.sports.includes(sport)).map((c) => ({ ...c }))),
    live: async () => {
      const uid = await currentUid();
      const { data, error } = await supabase
        .from('communities')
        .select('*')
        .contains('sports', [sport])
        .order('member_count', { ascending: false });
      if (error) return { data, error };
      // Which of these the user has joined.
      const ids = (data || []).map((c) => c.id);
      let joinedSet = new Set();
      if (ids.length) {
        const { data: mem } = await supabase
          .from('community_members')
          .select('community_id')
          .eq('user_id', uid)
          .in('community_id', ids);
        joinedSet = new Set((mem || []).map((m) => m.community_id));
      }
      const list = (data || []).map((c) => {
        // null when we don't know the user's or the community's location —
        // the card then omits the distance rather than claiming "0 mi".
        const dist = origin ? milesBetween(origin, { lat: c.lat, lng: c.lng }) : null;
        return {
          id: c.id,
          name: c.name,
          photo: c.photo,
          cover: c.cover,
          description: c.description,
          city: c.city,
          distance: dist != null ? Math.round(dist * 10) / 10 : null,
          sports: c.sports || [],
          memberCount: c.member_count || 0,
          joined: joinedSet.has(c.id),
        };
      });
      return { data: sortByDistance(list) };
    },
  });
}

export async function getCommunity(id) {
  const mockCommunity = () => mock.communities.find((c) => c.id === id) || null;
  if (!shouldTryLive()) return demoOnly(mockCommunity, null);
  try {
    const uid = await currentUid();
    const [{ data: c, error }, { data: posts }, { data: mem }] = await Promise.all([
      supabase.from('communities').select('*').eq('id', id).single(),
      supabase
        .from('community_posts')
        // Same ambiguity as court_posts (author_id vs community_post_likes) —
        // the FK name must be explicit or the community board comes back empty.
        .select('*,author:profiles!community_posts_author_id_fkey(' + PROFILE_COLS + ')')
        .eq('community_id', id)
        .order('pinned', { ascending: false })
        .order('created_at', { ascending: false }),
      supabase.from('community_members').select('user_id,profiles(' + PROFILE_COLS + ')').eq('community_id', id),
    ]);
    if (error) {
      if (isNetworkError(error)) markUnreachable();
      return demoOnly(mockCommunity, null);
    }
    markReachable();
    const members = (mem || []).map((m) => m.user_id);
    const memberProfiles = (mem || []).map((m) => dbProfileToApp(m.profiles, [])).filter(Boolean);
    return {
      id: c.id,
      name: c.name,
      photo: c.photo,
      cover: c.cover,
      description: c.description,
      city: c.city,
      distance: 0,
      sports: c.sports || [],
      memberCount: c.member_count || 0,
      members,
      memberProfiles,
      joined: uid ? members.includes(uid) : false,
      board: (posts || []).map((p) => ({
        id: p.id,
        authorType: p.author_type,
        author: p.author ? dbProfileToApp(p.author, []) : null,
        text: p.body,
        pinned: p.pinned,
        likes: p.likes || 0,
        timeAgo: timeAgo(p.created_at),
      })),
    };
  } catch (e) {
    markUnreachable();
    return demoOnly(mockCommunity, null);
  }
}

// Communities a given user belongs to. Used for My Profile (own id) and for
// another player's profile.
export async function getCommunitiesForUser(userId) {
  if (!userId) return [];
  return readList({
    fallbackOnEmpty: false,
    mockData: () => mock.getCommunitiesForPlayer(userId).map((c) => ({ ...c })),
    live: async () => {
      const { data, error } = await supabase
        .from('community_members')
        .select('communities(*)')
        .eq('user_id', userId);
      if (error) return { data, error };
      return {
        data: (data || [])
          .map((r) => r.communities)
          .filter(Boolean)
          .map((c) => ({
            id: c.id,
            name: c.name,
            photo: c.photo,
            cover: c.cover,
            city: c.city,
            sports: c.sports || [],
            memberCount: c.member_count || 0,
            joined: true,
          })),
      };
    },
  });
}

// Communities the current user belongs to (for My Profile).
export async function getMyCommunities() {
  const uid = await currentUid();
  return getCommunitiesForUser(uid || (DEMO ? 'me' : null));
}

export async function joinCommunity(id) {
  return write(async () => {
    const uid = await currentUid();
    return supabase.from('community_members').insert({ community_id: id, user_id: uid });
  });
}
export async function leaveCommunity(id) {
  return write(async () => {
    const uid = await currentUid();
    return supabase.from('community_members').delete().eq('community_id', id).eq('user_id', uid);
  });
}
export async function createCommunityPost(communityId, body) {
  return write(async () => {
    const uid = await currentUid();
    return supabase
      .from('community_posts')
      .insert({ community_id: communityId, author_id: uid, author_type: 'player', body })
      .select('id')
      .single();
  });
}

// ===========================================================================
// NOTIFICATIONS
// ===========================================================================
export async function getNotifications() {
  return readList({
    fallbackOnEmpty: false,
    mockData: () =>
      mock.notifications.map((n) => ({
        id: n.id,
        type: n.type,
        player: n.player,
        text: n.text,
        time: n.time,
        unread: n.unread,
      })),
    live: async () => {
      const uid = await currentUid();
      const { data, error } = await supabase
        .from('notifications')
        .select('id,type,body,read,created_at,actor:profiles!notifications_actor_id_fkey(' + PROFILE_COLS + ')')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) return { data, error };
      return {
        data: (data || []).map((n) => ({
          id: n.id,
          type: n.type,
          player: n.actor ? dbProfileToApp(n.actor, []) : null,
          text: n.body,
          time: timeAgo(n.created_at),
          unread: !n.read,
        })),
      };
    },
  });
}

export async function markNotificationRead(id) {
  return write(() => supabase.from('notifications').update({ read: true }).eq('id', id));
}
export async function markAllNotificationsRead() {
  return write(async () => {
    const uid = await currentUid();
    return supabase.from('notifications').update({ read: true }).eq('user_id', uid).eq('read', false);
  });
}

// ===========================================================================
// SCHEDULED HITS
// ===========================================================================
// Short human summary of a hit, used for message bodies, conversation
// previews and push text — anywhere a card can't be rendered.
export function hitSummary({ court, scheduledAt }) {
  const when = scheduledAt ? whenLabel(scheduledAt) : null;
  return ['Asked to hit', when, court].filter(Boolean).join(' · ');
}

// "Today 7:00 PM" / "Sat 9:00 AM" / "Mar 3, 9:00 AM"
export function whenLabel(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const sameDay = (a, b) => a.toDateString() === b.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (sameDay(d, now)) return `Today ${time}`;
  if (sameDay(d, tomorrow)) return `Tomorrow ${time}`;
  const withinWeek = (d - now) / 86400000 < 7 && d > now;
  if (withinWeek) return `${d.toLocaleDateString([], { weekday: 'short' })} ${time}`;
  return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${time}`;
}

// Propose a hit to someone and drop the card into your conversation, so the
// ask is visible in the thread rather than hidden in a separate list.
export async function proposeHit(draft) {
  if (!shouldTryLive()) return { ok: true, demo: true };
  try {
    const uid = await currentUid();
    const { data: hit, error } = await supabase
      .from('scheduled_hits')
      .insert({
        proposer_id: uid,
        invitee_id: draft.inviteeId,
        sport: draft.sport ?? null,
        court: draft.court ?? null,
        city: draft.city ?? null,
        scheduled_at: draft.scheduledAt ?? null,
        note: draft.note ?? null,
        court_post_id: draft.courtPostId ?? null,
        session_type: draft.sessionType ?? null,
      })
      .select('*')
      .single();
    if (error) return { ok: false, error };
    markReachable();

    let conversationId = draft.conversationId;
    if (!conversationId) {
      const conv = await getOrCreateConversation(draft.inviteeId, draft.sport ?? null);
      conversationId = conv?.id ?? null;
    }
    if (conversationId) {
      await sendMessage(conversationId, hitSummary(draft), {
        kind: 'hit',
        meta: {
          hitId: hit.id,
          court: hit.court,
          city: hit.city,
          scheduledAt: hit.scheduled_at,
          note: hit.note,
          sport: hit.sport,
          sessionType: hit.session_type,
          status: hit.status,
        },
      });
    }
    return { ok: true, hit, conversationId };
  } catch (e) {
    markUnreachable();
    return { ok: false, error: e };
  }
}

// Accept / decline / cancel, recording the outcome in the thread so both
// people can see what happened without opening anything else.
export async function respondToHit(hitId, status, { conversationId } = {}) {
  if (!shouldTryLive()) return { ok: true, demo: true };
  try {
    const { data: hit, error } = await supabase
      .from('scheduled_hits')
      .update({ status })
      .eq('id', hitId)
      .select('*')
      .single();
    if (error) return { ok: false, error };
    markReachable();

    const said = {
      accepted: "I'm in",
      declined: "Can't make it",
      cancelled: 'Hit cancelled',
    }[status];
    if (said && conversationId) {
      await sendMessage(conversationId, said, {
        kind: 'system',
        meta: { hitId, status },
      });
    }
    return { ok: true, hit };
  } catch (e) {
    markUnreachable();
    return { ok: false, error: e };
  }
}

// Change the time, court or note on an existing hit. Plans move around, so
// this stays available after it's been accepted. Rescheduling resets the hit
// to 'proposed' — the other person has to confirm the new time rather than
// silently ending up committed to something they never agreed to.
export async function rescheduleHit(hitId, changes, { conversationId } = {}) {
  if (!shouldTryLive()) return { ok: true, demo: true };
  try {
    const patch = { status: 'proposed' };
    if (changes.scheduledAt !== undefined) patch.scheduled_at = changes.scheduledAt;
    if (changes.court !== undefined) patch.court = changes.court;
    if (changes.note !== undefined) patch.note = changes.note;
    if (changes.sessionType !== undefined) patch.session_type = changes.sessionType;

    const { data: hit, error } = await supabase
      .from('scheduled_hits')
      .update(patch)
      .eq('id', hitId)
      .select('*')
      .single();
    if (error) return { ok: false, error };
    markReachable();

    if (conversationId) {
      await sendMessage(conversationId, `Updated: ${hitSummary({
        court: hit.court,
        scheduledAt: hit.scheduled_at,
      })}`, {
        kind: 'hit',
        meta: {
          hitId: hit.id,
          court: hit.court,
          city: hit.city,
          scheduledAt: hit.scheduled_at,
          note: hit.note,
          sport: hit.sport,
          sessionType: hit.session_type,
          status: hit.status,
          rescheduled: true,
        },
      });
    }
    return { ok: true, hit };
  } catch (e) {
    markUnreachable();
    return { ok: false, error: e };
  }
}

// "I'm in" on a Court Board post. Creates the hit and posts a reply into the
// existing DM thread, carrying a reference to the post so the author can see
// what it's about (Instagram-style story reply).
export async function joinCourtPost(post, message = "I'm in") {
  if (!shouldTryLive()) return { ok: true, demo: true };
  try {
    const uid = await currentUid();
    if (!post?.authorId || post.authorId === uid) {
      return { ok: false, error: new Error('Cannot join your own post') };
    }

    const conv = await getOrCreateConversation(post.authorId, post.sport ?? null);
    const conversationId = conv?.id ?? null;

    const { data: hit } = await supabase
      .from('scheduled_hits')
      .insert({
        proposer_id: post.authorId,
        invitee_id: uid,
        sport: post.sport ?? null,
        court: post.court ?? null,
        city: post.city ?? null,
        note: post.text ?? null,
        court_post_id: post.id,
        status: 'accepted', // joining an open post is an acceptance, not an ask
      })
      .select('*')
      .single();

    if (conversationId) {
      await sendMessage(conversationId, message, {
        kind: 'court_ref',
        meta: {
          postId: post.id,
          court: post.court,
          city: post.city,
          when: post.when,
          sport: post.sport,
          hitId: hit?.id ?? null,
        },
      });
    }
    return { ok: true, conversationId, hit };
  } catch (e) {
    markUnreachable();
    return { ok: false, error: e };
  }
}

// How many people have said they're in on each of the given posts.
export async function getCourtPostJoinCounts(postIds = []) {
  if (!shouldTryLive() || !postIds.length) return {};
  try {
    const { data, error } = await supabase
      .from('scheduled_hits')
      .select('court_post_id')
      .in('court_post_id', postIds)
      .neq('status', 'declined')
      .neq('status', 'cancelled');
    if (error) return {};
    const counts = {};
    for (const r of data || []) {
      if (!r.court_post_id) continue;
      counts[r.court_post_id] = (counts[r.court_post_id] || 0) + 1;
    }
    return counts;
  } catch (e) {
    return {};
  }
}

// Everything the user has arranged, grouped for the My Hits view.
export async function getMyHits() {
  if (!shouldTryLive()) return { upcoming: [], pending: [], past: [] };
  try {
    const uid = await currentUid();
    if (!uid) return { upcoming: [], pending: [], past: [] };

    const { data, error } = await supabase
      .from('scheduled_hits')
      .select(
        '*,proposer:profiles!scheduled_hits_proposer_id_fkey(' + PROFILE_COLS + ')' +
        ',invitee:profiles!scheduled_hits_invitee_id_fkey(' + PROFILE_COLS + ')'
      )
      .or(`proposer_id.eq.${uid},invitee_id.eq.${uid}`)
      .order('scheduled_at', { ascending: true, nullsFirst: false });
    if (error) return { upcoming: [], pending: [], past: [] };
    markReachable();

    const now = Date.now();
    const out = { upcoming: [], pending: [], past: [] };

    for (const r of data || []) {
      const mine = r.proposer_id === uid;
      const other = dbProfileToApp(mine ? r.invitee : r.proposer, []);
      const at = r.scheduled_at ? new Date(r.scheduled_at).getTime() : null;
      const hit = {
        id: r.id,
        status: r.status,
        sport: r.sport,
        court: r.court,
        city: r.city,
        scheduledAt: r.scheduled_at,
        whenText: r.scheduled_at ? whenLabel(r.scheduled_at) : null,
        note: r.note,
        courtPostId: r.court_post_id,
        iProposed: mine,
        player: other,
        // Only the person who was asked can accept or decline.
        awaitingMe: r.status === 'proposed' && !mine,
      };

      if (r.status === 'cancelled' || r.status === 'declined') continue;
      if (at != null && at < now) out.past.push(hit);
      else if (r.status === 'accepted') out.upcoming.push(hit);
      else out.pending.push(hit);
    }

    out.past.reverse(); // most recent first
    return out;
  } catch (e) {
    markUnreachable();
    return { upcoming: [], pending: [], past: [] };
  }
}

export async function acceptHit(id, opts) {
  return respondToHit(id, 'accepted', opts);
}
export async function declineHit(id, opts) {
  return respondToHit(id, 'declined', opts);
}
export async function cancelHit(id, opts) {
  return respondToHit(id, 'cancelled', opts);
}

// ===========================================================================
// BLOCK  +  REPORT
// ===========================================================================
export async function blockUser(blockedId) {
  mock.blockPlayer(blockedId); // keep local list in sync for instant UI
  return write(async () => {
    const uid = await currentUid();
    return supabase.from('blocks').upsert({ blocker_id: uid, blocked_id: blockedId }, { onConflict: 'blocker_id,blocked_id' });
  });
}
export async function unblockUser(blockedId) {
  mock.blockedIds.delete(blockedId);
  return write(async () => {
    const uid = await currentUid();
    return supabase.from('blocks').delete().eq('blocker_id', uid).eq('blocked_id', blockedId);
  });
}
export async function getBlockedIds() {
  if (!shouldTryLive()) return [...mock.blockedIds];
  try {
    const uid = await currentUid();
    const { data, error } = await supabase.from('blocks').select('blocked_id').eq('blocker_id', uid);
    if (error) return [...mock.blockedIds];
    markReachable();
    const ids = (data || []).map((b) => b.blocked_id);
    ids.forEach((id) => mock.blockPlayer(id));
    return ids;
  } catch (e) {
    return [...mock.blockedIds];
  }
}
// Permanently delete the signed-in user's account and all their data. Runs a
// SECURITY DEFINER function server-side because the client key deliberately
// can't delete auth users. Returns { ok } — callers should only sign out and
// show success when ok is true, so a failure isn't reported as a deletion.
export async function deleteMyAccount() {
  if (!isSupabaseConfigured) return { ok: true, demo: true };
  try {
    const { error } = await supabase.rpc('delete_my_account');
    if (error) return { ok: false, error };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e };
  }
}

export async function reportUser({ userId, reason, details }) {
  return write(async () => {
    const uid = await currentUid();
    return supabase.from('reports').insert({
      reporter_id: uid,
      reported_user_id: userId,
      reason,
      details: details || null,
    });
  });
}

// ===========================================================================
// SETTINGS  (privacy + notifications + account)
// ===========================================================================
export async function getSettings() {
  if (!shouldTryLive()) return null;
  try {
    const uid = await currentUid();
    if (!uid) return null;
    const { data, error } = await supabase
      .from('user_settings')
      .select('privacy,notifications,account')
      .eq('user_id', uid)
      .single();
    if (error) return null;
    markReachable();
    return data;
  } catch (e) {
    return null;
  }
}
export async function saveSettings(section, fullSectionValue) {
  return write(async () => {
    const uid = await currentUid();
    return supabase.from('user_settings').upsert({ user_id: uid, [section]: fullSectionValue });
  });
}
export async function savePushToken(token) {
  return write(async () => {
    const uid = await currentUid();
    return supabase.from('user_settings').upsert({ user_id: uid, push_token: token });
  });
}

// ===========================================================================
// STORAGE  (avatar / cover / gallery uploads → public URL)
// ===========================================================================
export async function uploadImage(userId, localUri, kind = 'photo') {
  if (!shouldTryLive() || !userId) return { ok: true, demo: true, url: localUri };
  try {
    const ext = (localUri.split('.').pop() || 'jpg').split('?')[0].toLowerCase();
    const path = `${userId}/${kind}-${Date.now()}.${ext}`;
    const res = await fetch(localUri);
    const arrayBuffer = await res.arrayBuffer();
    const { error } = await supabase.storage
      .from('media')
      .upload(path, arrayBuffer, { contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`, upsert: true });
    if (error) {
      if (isNetworkError(error)) markUnreachable();
      return { ok: false, error, url: localUri };
    }
    markReachable();
    const { data } = supabase.storage.from('media').getPublicUrl(path);
    return { ok: true, url: data.publicUrl };
  } catch (e) {
    markUnreachable();
    return { ok: false, error: e, url: localUri };
  }
}

export default {
  timeAgo,
  clockTime,
  getProfile,
  saveProfile,
  browsePlayers,
  sendMatchRequest,
  getIncomingRequests,
  acceptRequest,
  acceptRequestFrom,
  declineRequest,
  getFriends,
  getConversations,
  getOrCreateConversation,
  getMessages,
  sendMessage,
  markConversationRead,
  subscribeMessages,
  getCourtPosts,
  createCourtPost,
  updateCourtPost,
  deleteCourtPost,
  getCurrentUserId,
  getCommunities,
  getCommunity,
  getCommunitiesForUser,
  getMyCommunities,
  joinCommunity,
  leaveCommunity,
  createCommunityPost,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  proposeHit,
  respondToHit,
  rescheduleHit,
  joinCourtPost,
  getCourtPostJoinCounts,
  getMyHits,
  hitSummary,
  whenLabel,
  acceptHit,
  declineHit,
  cancelHit,
  blockUser,
  unblockUser,
  getBlockedIds,
  deleteMyAccount,
  reportUser,
  getSettings,
  saveSettings,
  uploadImage,
};
