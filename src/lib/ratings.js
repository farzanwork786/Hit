// Sports + friendly rating bands.
//
// Hit supports two sports with independent rating systems: tennis uses UTR
// (1–16.5) and pickleball uses DUPR (2.0–8.0, or NR for brand-new players).
// Skill does not transfer between sports, so each is stored separately on a
// profile under player.sports.{tennis|pickleball}.

export const SPORTS = {
  tennis: {
    key: 'tennis',
    label: 'Tennis',
    ratingName: 'UTR',
    ratingKey: 'utr',
    min: 1,
    max: 16.5,
  },
  pickleball: {
    key: 'pickleball',
    label: 'Pickleball',
    ratingName: 'DUPR',
    ratingKey: 'dupr',
    min: 2,
    max: 8,
  },
};

export const SPORT_KEYS = ['tennis', 'pickleball'];

// Beginner-friendly playing style — offered first everywhere.
export const BEGINNER_STYLE = '🌱 Still figuring it out — open to anything';

// Broad skill groups shown first in registration (detailed bands hidden behind
// "More detail"). Each maps to a representative rating value; `null` = NR/new.
export const SKILL_GROUPS = {
  tennis: [
    { id: 'new', label: 'New to tennis', blurb: 'Just starting out — learning to rally.', value: 1.5, isNew: true },
    { id: 'beginner', label: 'Beginner', blurb: 'Can keep short rallies going.', value: 3 },
    { id: 'intermediate', label: 'Intermediate', blurb: 'Consistent strokes, social & league play.', value: 5 },
    { id: 'advanced', label: 'Advanced', blurb: 'Complete game, competitive in tournaments.', value: 7.5 },
    { id: 'competitive', label: 'Competitive', blurb: 'College / tournament level and above.', value: 10 },
  ],
  pickleball: [
    { id: 'new', label: 'New to pickleball', blurb: 'Just starting out — learning the basics.', value: null, isNew: true },
    { id: 'beginner', label: 'Beginner', blurb: 'Learning serves, returns and dinks.', value: 2.5 },
    { id: 'intermediate', label: 'Intermediate', blurb: 'Consistent rallies, understand positioning.', value: 3.5 },
    { id: 'advanced', label: 'Advanced', blurb: 'Reliable third-shot drop, strong strategy.', value: 4.5 },
    { id: 'competitive', label: 'Competitive', blurb: 'Tournament level and above.', value: 5.5 },
  ],
};

export function skillGroupsFor(sport) {
  return SKILL_GROUPS[sport] || SKILL_GROUPS.tennis;
}

// Browse filter ranges. UTR steps by 2; DUPR by 1. "All" is the default.
export const UTR_FILTER_RANGES = [
  { id: 'all', label: 'All', min: 1, max: 16.5, all: true },
  { id: '1-3', label: '1–3', min: 1, max: 3 },
  { id: '3-5', label: '3–5', min: 3, max: 5 },
  { id: '5-7', label: '5–7', min: 5, max: 7 },
  { id: '7-9', label: '7–9', min: 7, max: 9 },
  { id: '9-11', label: '9–11', min: 9, max: 11 },
  { id: '11-13', label: '11–13', min: 11, max: 13 },
  { id: '13+', label: '13+', min: 13, max: 16.5 },
];

export const DUPR_FILTER_RANGES = [
  { id: 'all', label: 'All', min: 2, max: 8, all: true },
  { id: 'nr', label: 'New / NR', nrOnly: true },
  { id: '2-3', label: '2–3', min: 2, max: 3 },
  { id: '3-4', label: '3–4', min: 3, max: 4 },
  { id: '4-5', label: '4–5', min: 4, max: 5 },
  { id: '5+', label: '5+', min: 5, max: 8 },
];

export function filterRangesFor(sport) {
  return sport === 'pickleball' ? DUPR_FILTER_RANGES : UTR_FILTER_RANGES;
}

// Does a player's rating pass the selected filter range?
export function matchesRange(value, range) {
  if (!range || range.all) return true; // includes NR too
  if (range.nrOnly) return value === null;
  if (value === null) return false;
  return value >= range.min && value <= range.max;
}

// Friendly UTR bands — plain-English descriptions so beginners can
// self-identify without knowing their number.
export const UTR_BANDS = [
  { id: 'utr-1', min: 1, max: 2, title: 'UTR 1–2', desc: 'New to tennis: learning to rally and keep the ball in play. Matches are streaky and improvement is fast.' },
  { id: 'utr-2', min: 2, max: 3, title: 'UTR 2–3', desc: 'Advanced beginner: can sustain short rallies, basic serve, starting to control direction.' },
  { id: 'utr-3', min: 3, max: 4, title: 'UTR 3–4', desc: 'Lower intermediate: rallies with more purpose, developing consistency and depth. Typical recreational level.' },
  { id: 'utr-4', min: 4, max: 5, title: 'UTR 4–5', desc: 'Intermediate: consistent groundstrokes, can direct the ball, plays social and league tennis.' },
  { id: 'utr-5', min: 5, max: 6, title: 'UTR 5–6', desc: 'Strong intermediate: controls pace and rallies, recognizes and exploits weaknesses. High-school varsity / adult league.' },
  { id: 'utr-6', min: 6, max: 7, title: 'UTR 6–7', desc: 'Solid club player: complete set of strokes with a weapon or two, competitive in adult leagues and club tournaments.' },
  { id: 'utr-7', min: 7, max: 8, title: 'UTR 7–8', desc: 'Advanced club player: well-rounded game, above-average power and consistency, wins competitive local events.' },
  { id: 'utr-8', min: 8, max: 9, title: 'UTR 8–9', desc: 'Tournament player: strong all-around game, competes in upper-tier junior and open tournaments.' },
  { id: 'utr-9', min: 9, max: 10, title: 'UTR 9–10', desc: 'Highly competitive: national-level junior tournaments, Division 2/3 college caliber.' },
  { id: 'utr-10', min: 10, max: 11, title: 'UTR 10–11', desc: 'Open/college level: competitive at strong college programs.' },
  { id: 'utr-11', min: 11, max: 12, title: 'UTR 11–12', desc: 'Elite college: Division 1 college tennis level.' },
  { id: 'utr-12', min: 12, max: 13, title: 'UTR 12–13', desc: 'Top D1 / rising professional.' },
  { id: 'utr-13', min: 13, max: 14.5, title: 'UTR 13–14.5', desc: 'Professional: challenger-level tour players.' },
  { id: 'utr-14', min: 14.5, max: 16.5, title: 'UTR 14.5–16.5', desc: 'World-class touring professional.' },
];

// Friendly DUPR bands. The first band is "Not Rated" for brand-new players
// (rating value null).
export const DUPR_BANDS = [
  { id: 'dupr-nr', min: null, max: null, nr: true, title: 'Not Rated / New', desc: 'Brand new to pickleball: learning the rules, basic shots, and court positioning.' },
  { id: 'dupr-1', min: 2.0, max: 2.5, title: 'DUPR 2.0–2.5', desc: 'Beginner: developing serve, return, and dink consistency. Rallies are short.' },
  { id: 'dupr-2', min: 2.5, max: 3.0, title: 'DUPR 2.5–3.0', desc: 'Advanced beginner: can sustain rallies, learning the third-shot drop and kitchen play.' },
  { id: 'dupr-3', min: 3.0, max: 3.5, title: 'DUPR 3.0–3.5', desc: 'Intermediate: consistent rallies, understands court positioning and basic strategy.' },
  { id: 'dupr-4', min: 3.5, max: 4.0, title: 'DUPR 3.5–4.0', desc: 'Strong intermediate: reliable third-shot drop, controls tempo, fewer unforced errors.' },
  { id: 'dupr-5', min: 4.0, max: 4.5, title: 'DUPR 4.0–4.5', desc: 'Advanced: strong shot control and strategy, competitive in tournaments.' },
  { id: 'dupr-6', min: 4.5, max: 5.0, title: 'DUPR 4.5–5.0', desc: 'Highly advanced: excellent consistency, power, and shot selection.' },
  { id: 'dupr-7', min: 5.0, max: 6.0, title: 'DUPR 5.0–6.0', desc: 'Elite: high-level tournament competitor.' },
  { id: 'dupr-8', min: 6.0, max: 8.0, title: 'DUPR 6.0–8.0', desc: 'Professional: top-tier pro level.' },
];

export function bandsFor(sport) {
  return sport === 'pickleball' ? DUPR_BANDS : UTR_BANDS;
}

// Does this player play the given sport?
export function playsSport(player, sport) {
  return Boolean(player?.sports?.[sport]);
}

// Numeric rating for a sport, or null when unrated/not playing.
export function ratingValue(player, sport) {
  const entry = player?.sports?.[sport];
  if (!entry) return null;
  const v = entry[SPORTS[sport].ratingKey];
  return typeof v === 'number' ? v : null;
}

// "UTR 7.8" / "DUPR 3.5" / "NR" (plays but unrated) / null (doesn't play).
export function ratingLabel(player, sport) {
  if (!playsSport(player, sport)) return null;
  const v = ratingValue(player, sport);
  if (v === null) return 'NR';
  return `${SPORTS[sport].ratingName} ${v.toFixed(1)}`;
}

// Short value for stat boxes: "7.8" or "NR".
export function ratingShort(player, sport) {
  if (!playsSport(player, sport)) return null;
  const v = ratingValue(player, sport);
  return v === null ? 'NR' : v.toFixed(1);
}

export default {
  SPORTS,
  SPORT_KEYS,
  BEGINNER_STYLE,
  SKILL_GROUPS,
  skillGroupsFor,
  UTR_BANDS,
  DUPR_BANDS,
  bandsFor,
  filterRangesFor,
  matchesRange,
  playsSport,
  ratingValue,
  ratingLabel,
  ratingShort,
};
