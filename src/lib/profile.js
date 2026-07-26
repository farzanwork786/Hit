// Profile shape + privacy helpers.
//
// This module deliberately has NO dependency on mockData: it is what screens
// fall back to when a real profile hasn't loaded yet, so it must never be able
// to surface demo people, photos or friends in a live app.

// A blank profile with every field a screen might read already present, so
// components can render an empty state instead of crashing (or showing a
// stand-in person) while the real profile loads.
export const EMPTY_PROFILE = {
  id: null,
  name: '',
  username: '',
  email: '',
  phone: '',
  age: null,
  avatar: '',
  cover: '',
  photos: [],
  city: '',
  hand: 'Right',
  bio: '',
  availability: [],
  sports: {},
  isCommunity: false,
  communityType: null,
  verified: false,
  friendsVisibility: 'everyone',
  communitiesVisibility: 'everyone',
};

// Generic visibility gate for 'everyone' | 'friends' | 'me' settings.
// `viewerId` is the signed-in user's id (null when unknown).
function canSee(target, viewerId, vis) {
  if (!target) return false;
  if (viewerId && target.id === viewerId) return true; // always see your own
  const v = vis || 'everyone';
  if (v === 'everyone') return true;
  if (v === 'friends') return Boolean(viewerId) && (target.friends || []).includes(viewerId);
  return false; // 'me'
}

// Whether `viewerId` may see `target`'s friends list.
export function canSeeFriends(target, viewerId) {
  return canSee(target, viewerId, target?.friendsVisibility);
}

// Whether `viewerId` may see `target`'s communities.
export function canSeeCommunities(target, viewerId) {
  return canSee(target, viewerId, target?.communitiesVisibility);
}

export default { EMPTY_PROFILE, canSeeFriends, canSeeCommunities };
