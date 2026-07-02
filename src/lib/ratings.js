// Sports + self-reported Skill Levels.
//
// Hit uses one simple, self-reported "Skill Level" scale per sport:
// tennis runs 2.0–7.0 and pickleball runs 2.0–5.5, both in 0.5 steps.
// Skill does not transfer between sports, so each is stored separately on a
// profile under player.sports.{tennis|pickleball} as { rating, style }.
// rating: null = not set.

export const SPORTS = {
  tennis: {
    key: 'tennis',
    label: 'Tennis',
    ratingName: 'Skill Level',
    ratingKey: 'rating',
    min: 2.0,
    max: 7.0,
  },
  pickleball: {
    key: 'pickleball',
    label: 'Pickleball',
    ratingName: 'Skill Level',
    ratingKey: 'rating',
    min: 2.0,
    max: 5.5,
  },
};

export const SPORT_KEYS = ['tennis', 'pickleball'];

// Beginner-friendly playing style — offered first everywhere.
export const BEGINNER_STYLE = '🌱 Still figuring it out — open to anything';

// The full Skill Level scale per sport: number + plain-English description.
// Shown as a scrollable picker in onboarding and Edit Profile.
export const SKILL_LEVELS = {
  tennis: [
    { value: 2.0, desc: 'Brand new, just learning to hit' },
    { value: 2.5, desc: 'Learning court positions, inconsistent rallies' },
    { value: 3.0, desc: 'Can sustain rallies, knows basic scoring and rules' },
    { value: 3.5, desc: 'More consistent, starting to develop shots, plays recreationally' },
    { value: 4.0, desc: 'Dependable strokes, can play competitively at club level' },
    { value: 4.5, desc: 'Strong all-court game, uses strategy, plays tournaments' },
    { value: 5.0, desc: 'Tournament-level, powerful and consistent shots' },
    { value: 5.5, desc: 'Nationally competitive, near-professional level' },
    { value: 6.0, desc: 'Professional or ex-professional level' },
    { value: 6.5, desc: 'Top professional level' },
    { value: 7.0, desc: 'Elite world-class professional' },
  ],
  pickleball: [
    { value: 2.0, desc: 'Brand new, still learning the rules and basic shots' },
    { value: 2.5, desc: 'Learning to serve and return, limited consistency' },
    { value: 3.0, desc: 'Can sustain rallies, understands scoring and kitchen rules' },
    { value: 3.5, desc: 'More consistent, starting to dink and attack, plays recreationally' },
    { value: 4.0, desc: 'Solid all-around game, uses strategy, competitive club player' },
    { value: 4.5, desc: 'Strong player, plays tournaments, consistent third shot drops' },
    { value: 5.0, desc: 'Advanced tournament player, dominant in most amateur settings' },
    { value: 5.5, desc: 'Elite amateur / semi-pro level' },
  ],
};

export function skillLevelsFor(sport) {
  return SKILL_LEVELS[sport] || SKILL_LEVELS.tennis;
}

// Description text for a given level value (or null if not on the scale).
export function levelDescription(sport, value) {
  if (value == null) return null;
  const hit = skillLevelsFor(sport).find((l) => l.value === value);
  return hit ? hit.desc : null;
}

// Browse filter ranges per sport. "All" is the default; "Not set" matches
// players who haven't picked a level yet.
export const SKILL_FILTER_RANGES = {
  tennis: [
    { id: 'all', label: 'All', min: 2.0, max: 7.0, all: true },
    { id: 'notset', label: 'Not set', nrOnly: true },
    { id: '2-3', label: '2.0–3.0', min: 2.0, max: 3.0 },
    { id: '3-4', label: '3.0–4.0', min: 3.0, max: 4.0 },
    { id: '4-5', label: '4.0–5.0', min: 4.0, max: 5.0 },
    { id: '5-6', label: '5.0–6.0', min: 5.0, max: 6.0 },
    { id: '6+', label: '6.0+', min: 6.0, max: 7.0 },
  ],
  pickleball: [
    { id: 'all', label: 'All', min: 2.0, max: 5.5, all: true },
    { id: 'notset', label: 'Not set', nrOnly: true },
    { id: '2-3', label: '2.0–3.0', min: 2.0, max: 3.0 },
    { id: '3-4', label: '3.0–4.0', min: 3.0, max: 4.0 },
    { id: '4-5', label: '4.0–5.0', min: 4.0, max: 5.0 },
    { id: '5+', label: '5.0+', min: 5.0, max: 5.5 },
  ],
};

export function filterRangesFor(sport) {
  return SKILL_FILTER_RANGES[sport] || SKILL_FILTER_RANGES.tennis;
}

// Does a player's rating pass the selected filter range?
export function matchesRange(value, range) {
  if (!range || range.all) return true; // includes "not set" too
  if (range.nrOnly) return value === null;
  if (value === null) return false;
  return value >= range.min && value <= range.max;
}

// Does this player play the given sport?
export function playsSport(player, sport) {
  return Boolean(player?.sports?.[sport]);
}

// Numeric skill level for a sport, or null when not set / not playing.
export function ratingValue(player, sport) {
  const entry = player?.sports?.[sport];
  if (!entry) return null;
  const v = entry[SPORTS[sport].ratingKey];
  return typeof v === 'number' ? v : null;
}

// "4.5" (skill level number) or null when not set / not playing.
export function ratingLabel(player, sport) {
  if (!playsSport(player, sport)) return null;
  const v = ratingValue(player, sport);
  return v === null ? null : v.toFixed(1);
}

// Short value for stat boxes: "4.5" or null when not set.
export function ratingShort(player, sport) {
  if (!playsSport(player, sport)) return null;
  const v = ratingValue(player, sport);
  return v === null ? null : v.toFixed(1);
}

export default {
  SPORTS,
  SPORT_KEYS,
  BEGINNER_STYLE,
  SKILL_LEVELS,
  skillLevelsFor,
  levelDescription,
  SKILL_FILTER_RANGES,
  filterRangesFor,
  matchesRange,
  playsSport,
  ratingValue,
  ratingLabel,
  ratingShort,
};
