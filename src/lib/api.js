// Central data-access layer.
//
// Every screen talks to Supabase through these functions instead of importing
// mock data directly. Each read tries Supabase first and transparently falls
// back to local mock data when the backend is unconfigured, unreachable, or
// (for discovery content like Browse) returns nothing. Writes succeed silently
// in demo mode and surface real permission/validation errors when live.
//
// Shapes returned here match what the screens already expect (e.g. a player has
// `sports: { tennis: { utr, style }, pickleball: { dupr, style } }`).

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

// Read with mock fallback. `fallbackOnEmpty` is true for discovery content.
async function readList({ live, mockData, fallbackOnEmpty = false }) {
  if (!shouldTryLive()) return mockData();
  try {
    const { data, error } = await live();
    if (error) {
      if (isNetworkError(error)) markUnreachable();
      return mockData();
    }
    markReachable();
    if ((!data || data.length === 0) && fallbackOnEmpty) return mockData();
    return data || [];
  } catch (e) {
    markUnreachable();
    return mockData();
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
  if (!shouldTryLive()) return mock.getPlayer(id);
  try {
    const [{ data: row, error }, { data: sportsRows }] = await Promise.all([
      supabase.from('profiles').select(PROFILE_COLS).eq('id', id).single(),
      supabase.from('player_sports').select('sport,rating,style').eq('user_id', id),
    ]);
    if (error) {
      if (isNetworkError(error)) markUnreachable();
      return mock.getPlayer(id);
    }
    markReachable();
    return dbProfileToApp(row, sportsRows);
  } catch (e) {
    markUnreachable();
    return mock.getPlayer(id);
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

  if (!shouldTryLive()) return mockData();
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
      return mockData();
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
    return mockData();
  }
}

// ===========================================================================
// MATCH REQUESTS  +  FRIENDS
// ===========================================================================
export async function sendMatchRequest(toUserId, message) {
  return write(async () => {
    const uid = await currentUid();
    return supabase
      .from('match_requests')
      .upsert({ from_user: uid, to_user: toUserId, message, status: 'pending' }, { onConflict: 'from_user,to_user' });
  });
}

export async function getIncomingRequests() {
  return readList({
    fallbackOnEmpty: false,
    mockData: () =>
      mock.requests.map((r) => ({ id: r.id, player: r.player, message: r.message, time: r.time })),
    live: async () => {
      const uid = await currentUid();
      const { data, error } = await supabase
        .from('match_requests')
        .select('id,message,created_at,from_user,profiles!match_requests_from_user_fkey(' + PROFILE_COLS + ')')
        .eq('to_user', uid)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (error) return { data, error };
      return {
        data: (data || []).map((r) => ({
          id: r.id,
          player: dbProfileToApp(r.profiles, []),
          message: r.message,
          time: timeAgo(r.created_at),
        })),
      };
    },
  });
}

export async function acceptRequest(id) {
  return write(() => supabase.from('match_requests').update({ status: 'accepted' }).eq('id', id));
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
      })),
    live: async () => {
      const uid = await currentUid();
      const { data: parts, error } = await supabase
        .from('conversation_participants')
        .select('conversation_id,last_read_at')
        .eq('user_id', uid);
      if (error) return { data: null, error };
      const convIds = (parts || []).map((p) => p.conversation_id);
      if (!convIds.length) return { data: [] };

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
            _sortAt: last?.created_at || '',
          };
        })
        .filter((c) => c.player)
        .sort((a, b) => (a._sortAt < b._sortAt ? 1 : -1));
      return { data: chats };
    },
  });
}

export async function getOrCreateConversation(otherId) {
  if (!shouldTryLive()) return { ok: true, demo: true, id: null };
  try {
    const { data, error } = await supabase.rpc('get_or_create_conversation', { other: otherId });
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
        .select('id,body,sender_id,created_at')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      if (error) return { data, error };
      return {
        data: (data || []).map((m) => ({
          id: m.id,
          text: m.body,
          fromMe: m.sender_id === uid,
          time: clockTime(m.created_at),
        })),
      };
    },
  });
}

export async function sendMessage(conversationId, body) {
  return write(async () => {
    const uid = await currentUid();
    return supabase.from('messages').insert({ conversation_id: conversationId, sender_id: uid, body });
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
export async function getCourtPosts({ sport, maxDistance = 50 }) {
  return readList({
    fallbackOnEmpty: true,
    mockData: () =>
      mock.courtPosts
        .filter((p) => p.sport === sport && p.distance <= maxDistance)
        .map((p) => ({ ...p })),
    live: async () => {
      const { data, error } = await supabase
        .from('court_posts')
        .select('*,author:profiles(' + PROFILE_COLS + ')')
        .eq('sport', sport)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) return { data, error };
      return {
        data: (data || []).map((p) => ({
          id: p.id,
          sport: p.sport,
          author: dbProfileToApp(p.author, []),
          court: p.court,
          city: p.city,
          distance: 0,
          when: p.when_text,
          level: p.level,
          text: p.body,
          likes: p.likes || 0,
          comments: p.comments || 0,
          timeAgo: timeAgo(p.created_at),
        })),
      };
    },
  });
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
export async function getCommunities(sport) {
  return readList({
    fallbackOnEmpty: true,
    mockData: () => mock.communities.filter((c) => c.sports.includes(sport)).map((c) => ({ ...c })),
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
      return {
        data: (data || []).map((c) => ({
          id: c.id,
          name: c.name,
          photo: c.photo,
          cover: c.cover,
          description: c.description,
          city: c.city,
          distance: 0,
          sports: c.sports || [],
          memberCount: c.member_count || 0,
          joined: joinedSet.has(c.id),
        })),
      };
    },
  });
}

export async function getCommunity(id) {
  if (!shouldTryLive()) return mock.communities.find((c) => c.id === id) || null;
  try {
    const uid = await currentUid();
    const [{ data: c, error }, { data: posts }, { data: mem }] = await Promise.all([
      supabase.from('communities').select('*').eq('id', id).single(),
      supabase
        .from('community_posts')
        .select('*,author:profiles(' + PROFILE_COLS + ')')
        .eq('community_id', id)
        .order('pinned', { ascending: false })
        .order('created_at', { ascending: false }),
      supabase.from('community_members').select('user_id,profiles(' + PROFILE_COLS + ')').eq('community_id', id),
    ]);
    if (error) {
      if (isNetworkError(error)) markUnreachable();
      return mock.communities.find((x) => x.id === id) || null;
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
    return mock.communities.find((x) => x.id === id) || null;
  }
}

// Communities the current user belongs to (for My Profile).
export async function getMyCommunities() {
  return readList({
    fallbackOnEmpty: false,
    mockData: () => mock.getCommunitiesForPlayer('me').map((c) => ({ ...c })),
    live: async () => {
      const uid = await currentUid();
      const { data, error } = await supabase
        .from('community_members')
        .select('communities(*)')
        .eq('user_id', uid);
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
export async function proposeHit(draft) {
  return write(async () => {
    const uid = await currentUid();
    return supabase.from('scheduled_hits').insert({
      proposer_id: uid,
      invitee_id: draft.inviteeId,
      sport: draft.sport,
      court: draft.court,
      city: draft.city,
      scheduled_at: draft.scheduledAt,
      note: draft.note,
    });
  });
}
export async function getScheduledHits() {
  return readList({
    fallbackOnEmpty: false,
    mockData: () => [],
    live: async () => {
      const uid = await currentUid();
      const { data, error } = await supabase
        .from('scheduled_hits')
        .select('*')
        .or(`proposer_id.eq.${uid},invitee_id.eq.${uid}`)
        .order('scheduled_at', { ascending: true });
      return { data, error };
    },
  });
}
export async function acceptHit(id) {
  return write(() => supabase.from('scheduled_hits').update({ status: 'accepted' }).eq('id', id));
}
export async function declineHit(id) {
  return write(() => supabase.from('scheduled_hits').update({ status: 'declined' }).eq('id', id));
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
  joinCommunity,
  leaveCommunity,
  createCommunityPost,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  proposeHit,
  getScheduledHits,
  acceptHit,
  declineHit,
  blockUser,
  unblockUser,
  getBlockedIds,
  reportUser,
  getSettings,
  saveSettings,
  uploadImage,
};
