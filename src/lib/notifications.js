// Push notification service.
// All typed helpers work in demo mode by firing local notifications that
// simulate what the OTHER party would receive. When Supabase + EAS are
// connected, replace scheduleLocalNotification() bodies with edge-function
// calls that route to Expo's push API using stored push tokens.

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Show notifications when the app is foregrounded.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const NOTIF_TYPES = {
  MATCH_REQUEST: 'match_request',
  MESSAGE: 'message',
  MATCH_ACCEPTED: 'match_accepted',
  COURT_BOARD_REPLY: 'court_board_reply',
  COMMUNITY_POST: 'community_post',
};

// Request permissions and configure Android channel.
// Returns 'demo' in dev mode (no EAS project ID yet); returns null if denied.
// When EAS is configured: replace return value with getExpoPushTokenAsync().data
// and store it on the user's Supabase profile row.
export async function registerForPushNotifications() {
  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Hit',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#2563EB',
    });
  }

  // TODO (backend): const token = (await Notifications.getExpoPushTokenAsync({ projectId: '...' })).data;
  // await supabase.from('profiles').update({ push_token: token }).eq('id', userId);
  return 'demo';
}

// Internal — schedules a local notification to simulate a push.
async function scheduleLocalNotification(title, body, data = {}, delaySecs = 3) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body, data, sound: true },
      trigger: delaySecs > 0 ? { seconds: delaySecs } : null,
    });
  } catch (_) {
    // Permissions not granted — silently skip.
  }
}

// ---------------------------------------------------------------------------
// Typed notification helpers — call these at every action site in the app.
// In demo mode they fire a local notification (visible in Notification Center)
// so the flow can be demoed end-to-end without a backend.
// ---------------------------------------------------------------------------

// Recipient gets this when someone sends them a play request.
export function notifyMatchRequest(fromPlayer) {
  scheduleLocalNotification(
    `${fromPlayer.name} wants to play`,
    'You have a new play request. Tap to review.',
    { type: NOTIF_TYPES.MATCH_REQUEST, playerId: fromPlayer.id }
  );
}

// Sender gets this when their request is accepted.
export function notifyMatchAccepted(player) {
  scheduleLocalNotification(
    "You're set to play!",
    `${player.name} accepted your request. Say hi!`,
    { type: NOTIF_TYPES.MATCH_ACCEPTED, playerId: player.id },
    2
  );
}

// Recipient gets this when a new message arrives in a chat.
export function notifyMessage(fromPlayer, preview) {
  scheduleLocalNotification(
    fromPlayer.name,
    preview ? (preview.length > 80 ? preview.slice(0, 77) + '…' : preview) : 'Sent you a message',
    { type: NOTIF_TYPES.MESSAGE, playerId: fromPlayer.id }
  );
}

// Post author gets this when someone taps "I'm in".
export function notifyCourtBoardReply(fromPlayer) {
  scheduleLocalNotification(
    `${fromPlayer.name} is in!`,
    'Someone replied to your court board post.',
    { type: NOTIF_TYPES.COURT_BOARD_REPLY }
  );
}

// Community members get this when a new post is made.
export function notifyCommunityPost(communityName, authorName) {
  scheduleLocalNotification(
    communityName,
    `${authorName} posted something new.`,
    { type: NOTIF_TYPES.COMMUNITY_POST }
  );
}
