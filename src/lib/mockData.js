// Local mock data used when Supabase is not configured (or as seed reference).
// Photos use deterministic unsplash URLs so the UI looks realistic out of the box.
//
// Player model:
//   sports: {
//     tennis:     { utr: 7.8, style: 'Aggressive Baseliner' },   // present if they play tennis
//     pickleball: { dupr: 3.4, style: 'All-Around' },            // dupr: null = NR (not rated)
//   }
//   friends: ['p1', ...]            ids of players they've connected with
//   friendsVisibility: 'everyone' | 'friends' | 'me'

import { BEGINNER_STYLE } from './ratings';

export const PLAYING_STYLES = {
  tennis: [
    BEGINNER_STYLE,
    'Aggressive Baseliner',
    'Serve & Volley',
    'All-Court',
    'Counterpuncher',
    'Pusher',
  ],
  pickleball: [
    BEGINNER_STYLE,
    'Aggressive Driver',
    'Soft Game / Dinker',
    'All-Around',
    'Counterattacker',
    'Banger',
  ],
};

// Short, friendly style list for registration (max 4, one line each).
export const REG_STYLES = {
  tennis: PLAYING_STYLES.tennis.slice(0, 4),
  pickleball: PLAYING_STYLES.pickleball.slice(0, 4),
};

export const players = [
  {
    id: 'p1',
    name: 'Maya Chen',
    age: 29,
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&q=80',
    cover: 'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?w=900&q=80',
    city: 'Austin, TX',
    distance: 3.2,
    sports: {
      tennis: { utr: 7.8, style: 'Aggressive Baseliner' },
    },
    hand: 'Right',
    bio: 'Former college player looking for competitive hitting partners on weekday evenings. I love long baseline rallies and a good tiebreak battle.',
    availability: ['Weekday evenings', 'Sunday mornings'],
    verified: true,
    friends: ['me', 'p3', 'p6'],
    friendsVisibility: 'everyone',
    gallery: [
      'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?w=500&q=80',
      'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=500&q=80',
      'https://images.unsplash.com/photo-1542144582-1ba00456b5e3?w=500&q=80',
    ],
  },
  {
    id: 'p2',
    name: 'Diego Ramirez',
    age: 34,
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&q=80',
    cover: 'https://images.unsplash.com/photo-1530915365347-e35b749a0381?w=900&q=80',
    city: 'Round Rock, TX',
    distance: 8.6,
    sports: {
      tennis: { utr: 6.1, style: 'Serve & Volley' },
      pickleball: { dupr: 3.4, style: 'All-Around' },
    },
    hand: 'Right',
    bio: 'Weekend warrior playing both racquet sports. Big first serve on the tennis court, working on my third-shot drop on the pickleball court.',
    availability: ['Saturday afternoons', 'Sunday'],
    verified: false,
    friends: ['me', 'p4', 'p7'],
    friendsVisibility: 'everyone',
    gallery: [
      'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=500&q=80',
      'https://images.unsplash.com/photo-1551958219-acbc608c6377?w=500&q=80',
    ],
  },
  {
    id: 'p3',
    name: 'Aisha Patel',
    age: 26,
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&q=80',
    cover: 'https://images.unsplash.com/photo-1531315630201-bb15abeb1653?w=900&q=80',
    city: 'Cedar Park, TX',
    distance: 5.4,
    sports: {
      tennis: { utr: 9.2, style: 'All-Court' },
    },
    hand: 'Left',
    bio: 'Tournament player chasing UTR points. Looking for partners who can push me. Lefty with a heavy topspin forehand.',
    availability: ['Early mornings', 'Weekday evenings'],
    verified: true,
    friends: ['me', 'p1', 'p6'],
    friendsVisibility: 'friends',
    gallery: [
      'https://images.unsplash.com/photo-1526232761682-d26e03ac148e?w=500&q=80',
      'https://images.unsplash.com/photo-1560012057-4372e14c5085?w=500&q=80',
      'https://images.unsplash.com/photo-1599058917212-d750089bc07e?w=500&q=80',
    ],
  },
  {
    id: 'p4',
    name: 'Tom Becker',
    age: 41,
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80',
    cover: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=900&q=80',
    city: 'Austin, TX',
    distance: 2.1,
    sports: {
      tennis: { utr: 4.5, style: 'Counterpuncher' },
      pickleball: { dupr: null, style: 'Soft Game / Dinker' }, // brand new — NR
    },
    hand: 'Right',
    bio: 'Getting back into tennis after a long break, and just picked up a pickleball paddle. Looking for relaxed rallies and to slowly level up.',
    availability: ['Weekday mornings'],
    verified: false,
    friends: ['p2'],
    friendsVisibility: 'me',
    gallery: [
      'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?w=500&q=80',
    ],
  },
  {
    id: 'p5',
    name: 'Sofia Nowak',
    age: 31,
    avatar: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400&q=80',
    cover: 'https://images.unsplash.com/photo-1542144582-1ba00456b5e3?w=900&q=80',
    city: 'Pflugerville, TX',
    distance: 11.3,
    sports: {
      tennis: { utr: 8.0, style: 'Aggressive Baseliner' },
    },
    hand: 'Right',
    bio: 'Competitive player who hits hard and flat. I play in two local leagues and am always looking for extra practice sets midweek.',
    availability: ['Tuesday & Thursday evenings'],
    verified: true,
    friends: ['p1', 'p3'],
    friendsVisibility: 'everyone',
    gallery: [
      'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?w=500&q=80',
      'https://images.unsplash.com/photo-1531315630201-bb15abeb1653?w=500&q=80',
    ],
  },
  {
    id: 'p6',
    name: 'Marcus Hall',
    age: 23,
    avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=400&q=80',
    cover: 'https://images.unsplash.com/photo-1551958219-acbc608c6377?w=900&q=80',
    city: 'Austin, TX',
    distance: 4.8,
    sports: {
      tennis: { utr: 11.4, style: 'All-Court' },
    },
    hand: 'Right',
    bio: 'Ex-D1 player and current coach. Happy to hit with most levels and give a few pointers. Big topspin game and a reliable serve.',
    availability: ['Most days after 5pm'],
    verified: true,
    friends: ['me', 'p1', 'p3'],
    friendsVisibility: 'everyone',
    gallery: [
      'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=500&q=80',
      'https://images.unsplash.com/photo-1526232761682-d26e03ac148e?w=500&q=80',
      'https://images.unsplash.com/photo-1560012057-4372e14c5085?w=500&q=80',
    ],
  },
  {
    id: 'p7',
    name: 'Priya Raman',
    age: 37,
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&q=80',
    cover: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=900&q=80',
    city: 'Austin, TX',
    distance: 6.1,
    sports: {
      pickleball: { dupr: 4.2, style: 'Aggressive Driver' },
    },
    hand: 'Right',
    bio: 'Pickleball addict — on the courts four mornings a week. Love fast hands battles at the kitchen. Always up for competitive rec games or tournament prep.',
    availability: ['Weekday mornings', 'Saturday'],
    verified: true,
    friends: ['me', 'p2', 'p8'],
    friendsVisibility: 'everyone',
    gallery: [
      'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=500&q=80',
    ],
  },
  {
    id: 'p8',
    name: 'Jordan Lee',
    age: 28,
    avatar: 'https://images.unsplash.com/photo-1500917293891-ef795e70e1f6?w=400&q=80',
    cover: 'https://images.unsplash.com/photo-1530915365347-e35b749a0381?w=900&q=80',
    city: 'Cedar Park, TX',
    distance: 7.5,
    sports: {
      pickleball: { dupr: 2.8, style: 'Soft Game / Dinker' },
    },
    hand: 'Left',
    bio: 'Picked up pickleball six months ago and completely hooked. Working on my drops and resets — looking for patient partners around my level.',
    availability: ['Weekends', 'Friday evenings'],
    verified: false,
    friends: ['p7'],
    friendsVisibility: 'friends',
    gallery: [],
  },
];

// Times a player can mark themselves available — shared by registration,
// Edit Profile and Settings so the options stay consistent.
export const AVAILABILITY_OPTIONS = [
  'Weekday mornings',
  'Weekday afternoons',
  'Weekday evenings',
  'Saturday mornings',
  'Saturday afternoons',
  'Sunday mornings',
  'Sunday afternoons',
  'Late nights',
];

export const currentUser = {
  id: 'me',
  name: 'Alex Rivera',
  age: 30,
  username: 'alexrivera',
  email: 'amirifarzan2003@gmail.com',
  phone: '',
  avatar: 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=400&q=80',
  cover: 'https://images.unsplash.com/photo-1530915365347-e35b749a0381?w=900&q=80',
  // Gallery photos (max 6) shown on the profile and managed in Edit Profile.
  photos: [
    'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?w=600&q=80',
    'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=600&q=80',
    'https://images.unsplash.com/photo-1542144582-1ba00456b5e3?w=600&q=80',
  ],
  city: 'Austin, TX',
  sports: {
    tennis: { utr: 7.5, style: 'All-Court' },
    pickleball: { dupr: 3.2, style: 'All-Around' },
  },
  hand: 'Right',
  bio: 'Hitting partner wanted! All-court tennis player, and learning the soft game in pickleball. Love a competitive set followed by a coffee.',
  availability: ['Weekday evenings', 'Saturday mornings'],
  friends: ['p1', 'p2', 'p3', 'p6', 'p7'],
  friendsVisibility: 'everyone',
  communitiesVisibility: 'everyone',
};

// Lookup helpers -----------------------------------------------------------
const byId = Object.fromEntries([...players, currentUser].map((p) => [p.id, p]));

export function getPlayer(id) {
  return byId[id] || null;
}

export function getFriends(player) {
  return (player?.friends || []).map((id) => byId[id]).filter(Boolean);
}

// Communities a player belongs to (derived from community membership lists).
export function getCommunitiesForPlayer(playerId) {
  return communities.filter((c) => (c.members || []).includes(playerId));
}

// Generic visibility check for 'everyone' | 'friends' | 'me' settings.
function canSee(player, viewer, vis) {
  if (!player) return false;
  if (player.id === viewer.id) return true;
  const v = vis || 'everyone';
  if (v === 'everyone') return true;
  if (v === 'friends') return (player.friends || []).includes(viewer.id);
  return false; // 'me'
}

// Whether `viewer` can see `player`'s friends list.
export function canSeeFriends(player, viewer = currentUser) {
  return canSee(player, viewer, player?.friendsVisibility);
}

// Whether `viewer` can see `player`'s communities.
export function canSeeCommunities(player, viewer = currentUser) {
  return canSee(player, viewer, player?.communitiesVisibility);
}

// In-memory block list for demo mode.
export const blockedIds = new Set();
export function blockPlayer(id) { blockedIds.add(id); }
export function isBlocked(id) { return blockedIds.has(id); }

// Court Board posts (location-tagged "looking to play" requests), per sport.
export const POST_LEVELS = {
  tennis: ['Any level', 'UTR 1–3', 'UTR 3–5', 'UTR 5–7', 'UTR 7–9', 'UTR 9+'],
  pickleball: ['Any level', 'NR / New', 'DUPR 2.0–3.0', 'DUPR 3.0–4.0', 'DUPR 4.0–5.0', 'DUPR 5.0+'],
};

export const courtPosts = [
  {
    id: 'cp1',
    sport: 'tennis',
    author: players[2],
    timeAgo: '12m',
    court: 'Pharr Tennis Center',
    city: 'Austin, TX',
    distance: 5.4,
    when: 'Today, 6:30 PM',
    level: 'UTR 7–9',
    text: 'Lost my hitting partner for tonight. Looking for a competitive set or two under the lights. Bring new balls!',
    likes: 8,
    comments: 3,
  },
  {
    id: 'cp2',
    sport: 'tennis',
    author: players[1],
    timeAgo: '48m',
    court: 'Old Settlers Park Courts',
    city: 'Round Rock, TX',
    distance: 8.6,
    when: 'Saturday, 10:00 AM',
    level: 'UTR 3–5',
    text: 'Putting together a friendly doubles group Saturday morning. Need one or two more. All welcome, low pressure!',
    likes: 14,
    comments: 6,
  },
  {
    id: 'cp3',
    sport: 'tennis',
    author: players[5],
    timeAgo: '2h',
    court: 'Austin High School Courts',
    city: 'Austin, TX',
    distance: 4.8,
    when: 'Sunday, 8:00 AM',
    level: 'UTR 9+',
    text: 'Early bird singles before it gets hot. Strong players only please — looking to get a real workout in. Best of 3 sets.',
    likes: 5,
    comments: 1,
  },
  {
    id: 'cp4',
    sport: 'tennis',
    author: players[0],
    timeAgo: '5h',
    court: 'Zilker Park Courts',
    city: 'Austin, TX',
    distance: 3.2,
    when: 'Wednesday, 7:00 PM',
    level: 'UTR 7–9',
    text: 'Anyone want to drill for an hour then play a set? Working on my approach shots and could use a partner to rally with.',
    likes: 11,
    comments: 4,
  },
  {
    id: 'cp5',
    sport: 'pickleball',
    author: players[6],
    timeAgo: '25m',
    court: 'Austin Pickle Ranch',
    city: 'Austin, TX',
    distance: 6.1,
    when: 'Tomorrow, 8:00 AM',
    level: 'DUPR 4.0–5.0',
    text: 'Two courts booked for tournament prep. Need one more strong player for competitive doubles rotation. Fast hands required!',
    likes: 9,
    comments: 5,
  },
  {
    id: 'cp6',
    sport: 'pickleball',
    author: players[7],
    timeAgo: '1h',
    court: 'Brushy Creek Lake Park',
    city: 'Cedar Park, TX',
    distance: 7.5,
    when: 'Saturday, 9:00 AM',
    level: 'DUPR 2.0–3.0',
    text: 'Beginner-friendly open play Saturday morning! Bring a paddle and good vibes — we rotate partners every game. New players very welcome.',
    likes: 21,
    comments: 8,
  },
  {
    id: 'cp7',
    sport: 'pickleball',
    author: players[1],
    timeAgo: '3h',
    court: 'South Austin Rec Center',
    city: 'Austin, TX',
    distance: 4.2,
    when: 'Thursday, 6:00 PM',
    level: 'DUPR 3.0–4.0',
    text: 'Indoor courts reserved Thursday evening. Looking for 3.0-3.5 players for some games — working on my kitchen patience 😅',
    likes: 6,
    comments: 2,
  },
];

// Communities — clubs, parks and groups with their own pages and boards.
// sports: ['tennis'], ['pickleball'] or both. joined: current user is a member.
// Board posts by the community account itself can be pinned announcements.
export const communities = [
  {
    id: 'com1',
    name: 'Zilker Park Tennis Club',
    photo: 'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?w=900&q=80',
    description:
      'The friendly home of public-court tennis in Austin. Weekly socials, ladder leagues, and open hitting sessions on the Zilker courts. All levels welcome — from first rally to tournament sharp.',
    city: 'Austin, TX',
    distance: 3.2,
    sports: ['tennis'],
    memberCount: 248,
    members: ['me', 'p1', 'p4', 'p6'],
    joined: true,
    board: [
      {
        id: 'b1',
        authorType: 'community',
        author: null,
        text: '🏆 Spring Ladder finals this Saturday 10 AM, courts 1–4. Finalists check in by 9:40. Spectators welcome — we will have shade tents and cold brew!',
        timeAgo: '3h',
        pinned: true,
        likes: 32,
      },
      {
        id: 'b2',
        authorType: 'player',
        author: players[0],
        text: 'Courts 5 and 6 were just resurfaced and they play fast. Get out there before everyone finds out 👀',
        timeAgo: '6h',
        pinned: false,
        likes: 12,
      },
      {
        id: 'b3',
        authorType: 'player',
        author: players[5],
        text: 'Running a free serve clinic Sunday 9 AM for club members. First ten to reply are in.',
        timeAgo: '1d',
        pinned: false,
        likes: 27,
      },
    ],
  },
  {
    id: 'com2',
    name: 'Austin Pickleball Collective',
    photo: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=900&q=80',
    description:
      'Austin\'s largest pickleball community. Daily open play across the city, beginner clinics every weekend, and a thriving competitive scene. Drop in — someone is always playing.',
    city: 'Austin, TX',
    distance: 5.0,
    sports: ['pickleball'],
    memberCount: 512,
    members: ['me', 'p2', 'p7', 'p8'],
    joined: true,
    board: [
      {
        id: 'b1',
        authorType: 'community',
        author: null,
        text: '📣 Round-robin tournament this weekend at Austin Pickle Ranch! Divisions for every DUPR band, NR players get a free intro clinic at 8 AM. Register by Friday.',
        timeAgo: '2h',
        pinned: true,
        likes: 58,
      },
      {
        id: 'b2',
        authorType: 'player',
        author: players[6],
        text: 'Morning crew was 20 deep today. If you are NR or 2.5 and nervous about open play — come at 8, we set aside two courts for newer players.',
        timeAgo: '5h',
        pinned: false,
        likes: 19,
      },
    ],
  },
  {
    id: 'com3',
    name: 'Westwood Country Club',
    photo: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=900&q=80',
    description:
      '12 har-tru tennis courts and 6 dedicated pickleball courts in the heart of Westlake. Member events, pro-led clinics for both sports, and a legendary post-match patio.',
    city: 'Austin, TX',
    distance: 8.9,
    sports: ['tennis', 'pickleball'],
    memberCount: 186,
    members: ['p1', 'p3', 'p5'],
    joined: false,
    board: [
      {
        id: 'b1',
        authorType: 'community',
        author: null,
        text: 'Member-guest weekend is back June 27–28: tennis Saturday, pickleball Sunday. Bring a friend, win the cup.',
        timeAgo: '1d',
        pinned: true,
        likes: 24,
      },
    ],
  },
  {
    id: 'com4',
    name: 'Brushy Creek Dink House',
    photo: 'https://images.unsplash.com/photo-1530915365347-e35b749a0381?w=900&q=80',
    description:
      'Cedar Park\'s grassroots pickleball crew. We run sunrise open play at Brushy Creek Lake Park, casual evening games, and a very serious taco rotation afterwards.',
    city: 'Cedar Park, TX',
    distance: 7.5,
    sports: ['pickleball'],
    memberCount: 94,
    members: ['p7', 'p8'],
    joined: false,
    board: [
      {
        id: 'b1',
        authorType: 'community',
        author: null,
        text: '☀️ Sunrise open play moves to 7:30 AM starting next week (it is getting hot, people). Same courts, same tacos.',
        timeAgo: '4h',
        pinned: true,
        likes: 41,
      },
      {
        id: 'b2',
        authorType: 'player',
        author: players[7],
        text: 'Lost a blue Selkirk paddle cover at the park Tuesday — anyone grab it by accident?',
        timeAgo: '2d',
        pinned: false,
        likes: 3,
      },
    ],
  },
];

export const chats = [
  {
    id: 'c1',
    player: players[0],
    lastMessage: 'Perfect, see you at 6:30 then!',
    time: '2:14 PM',
    unread: 2,
  },
  {
    id: 'c2',
    player: players[5],
    lastMessage: 'Good games today, you have a nasty slice 😅',
    time: 'Yesterday',
    unread: 0,
  },
  {
    id: 'c3',
    player: players[6],
    lastMessage: 'Bring your paddle — first game at 8 sharp!',
    time: 'Mon',
    unread: 0,
  },
];

export const requests = [
  {
    id: 'r1',
    player: players[3],
    message: 'Hey! Looks like we are around the same level — want to hit this week?',
    time: '1h',
  },
  {
    id: 'r2',
    player: players[7],
    message: 'Saw you play pickleball too — up for some beginner-friendly games Saturday?',
    time: '3h',
  },
];

export const messagesByChat = {
  c1: [
    { id: 'm1', fromMe: false, text: 'Hey Alex! Saw your profile, want to hit this week?', time: '1:40 PM' },
    { id: 'm2', fromMe: true, text: 'Absolutely. We are close in UTR so should be a good match.', time: '1:45 PM' },
    { id: 'm3', fromMe: false, text: 'Great. Pharr Tennis Center works for me. Tonight?', time: '2:01 PM' },
    { id: 'm4', fromMe: true, text: 'Tonight works. 6:30?', time: '2:10 PM' },
    { id: 'm5', fromMe: false, text: 'Perfect, see you at 6:30 then!', time: '2:14 PM' },
  ],
  c2: [
    { id: 'm1', fromMe: false, text: 'Good games today, you have a nasty slice 😅', time: '6:02 PM' },
    { id: 'm2', fromMe: true, text: 'Ha! Your forehand kept me running. Rematch next week?', time: '6:10 PM' },
  ],
  c3: [
    { id: 'm1', fromMe: false, text: 'Bring your paddle — first game at 8 sharp!', time: 'Mon' },
  ],
};

export const notifications = [
  { id: 'n1', type: 'request', player: players[3], text: 'sent you a match request', time: '1h', unread: true },
  { id: 'n2', type: 'message', player: players[0], text: 'sent you a message', time: '2h', unread: true },
  { id: 'n3', type: 'match', player: players[6], text: 'accepted your match request', time: '5h', unread: false },
  { id: 'n4', type: 'like', player: players[2], text: 'liked your Court Board post', time: '1d', unread: false },
  { id: 'n5', type: 'system', player: null, text: 'Your profile was verified ✓', time: '2d', unread: false },
];

export default {
  players,
  currentUser,
  getPlayer,
  getFriends,
  canSeeFriends,
  getCommunitiesForPlayer,
  canSeeCommunities,
  courtPosts,
  communities,
  chats,
  requests,
  messagesByChat,
  notifications,
  PLAYING_STYLES,
  REG_STYLES,
  POST_LEVELS,
  AVAILABILITY_OPTIONS,
  blockPlayer,
  isBlocked,
  blockedIds,
};
