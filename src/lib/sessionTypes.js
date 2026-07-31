// What kind of session someone wants.
//
// Not everyone wants to compete — plenty of people just want to rally or work
// on something. Making that an explicit choice keeps the app from reading as
// match-only, and lets people find the kind of hit they're actually after.

export const SESSION_TYPES = [
  {
    key: 'rally',
    label: 'Rally',
    blurb: 'Hit around, warm up, no scoring',
    icon: 'tennisball-outline',
  },
  {
    key: 'practice',
    label: 'Practice',
    blurb: 'Drills or working on specific shots',
    icon: 'repeat-outline',
  },
  {
    key: 'match',
    label: 'Match',
    blurb: 'Play sets and keep score',
    icon: 'trophy-outline',
  },
];

export const SESSION_TYPE_KEYS = SESSION_TYPES.map((s) => s.key);

export function sessionType(key) {
  return SESSION_TYPES.find((s) => s.key === key) || null;
}

export function sessionLabel(key) {
  return sessionType(key)?.label || null;
}

// How many players a Court Board post is looking for. `null` = open session.
export const SPOT_OPTIONS = [
  { value: 1, label: '1 player' },
  { value: 2, label: '2 players' },
  { value: 3, label: '3 players' },
  { value: null, label: 'Open' },
];

// "1 spot left" / "Full" / "Open session"
export function spotsLabel(spotsNeeded, joined = 0) {
  if (spotsNeeded == null) return joined > 0 ? `${joined} in · Open` : 'Open session';
  const left = Math.max(spotsNeeded - joined, 0);
  if (left === 0) return 'Full';
  return `${left} spot${left === 1 ? '' : 's'} left`;
}

export function isFull(spotsNeeded, joined = 0) {
  return spotsNeeded != null && joined >= spotsNeeded;
}

export default { SESSION_TYPES, SESSION_TYPE_KEYS, sessionType, sessionLabel, SPOT_OPTIONS, spotsLabel, isFull };
