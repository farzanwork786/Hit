// Push notification service.
//
// HOW DELIVERY WORKS
//   Real pushes are sent by the BACKEND, not by this file. A Postgres trigger
//   (see supabase/migrations/*_push_notifications.sql) fires whenever a message
//   or play request is inserted, looks up the recipient's Expo push token in
//   user_settings.push_token, and POSTs to Expo's push service. That's what
//   makes the OTHER person's phone buzz.
//
//   This file's job on the client is therefore just to (a) obtain a real Expo
//   push token and hand it to the backend, and (b) present notifications.
//
// DEMO MODE
//   With no Supabase credentials there is no backend to route anything, so the
//   notify* helpers below fire a LOCAL notification instead, purely so the flow
//   can be demoed end-to-end on one device. They are no-ops in a live app —
//   otherwise the sender would get a notification about their own action.

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { isSupabaseConfigured } from './supabase';

// Demo mode = no backend configured.
const DEMO = !isSupabaseConfigured;

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

// The EAS project id, needed to mint an Expo push token.
function easProjectId() {
  return (
    Constants?.expoConfig?.extra?.eas?.projectId ??
    Constants?.easConfig?.projectId ??
    null
  );
}

// Request permission, configure the Android channel, and return a real Expo
// push token (or null when denied / unavailable). The token is what the backend
// targets to reach this device.
export async function registerForPushNotifications() {
  // Push only works on physical hardware; simulators can't receive it.
  if (!Device.isDevice) return null;

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

  try {
    const projectId = easProjectId();
    const token = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    return token?.data ?? null;
  } catch (e) {
    // Token minting can fail in dev clients / misconfigured builds — treat it
    // as "no push" rather than breaking sign-in.
    return null;
  }
}

// Internal — schedules a local notification. Demo mode only (see header).
async function scheduleLocalNotification(title, body, data = {}, delaySecs = 3) {
  if (!DEMO) return; // live: the backend pushes to the RECIPIENT instead
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
// Typed helpers. In a live app these are no-ops: the backend trigger notifies
// the recipient. In demo mode they simulate that on this device.
// ---------------------------------------------------------------------------

export function notifyMatchRequest(fromPlayer) {
  scheduleLocalNotification(
    `${fromPlayer.name} wants to play`,
    'You have a new play request. Tap to review.',
    { type: NOTIF_TYPES.MATCH_REQUEST, playerId: fromPlayer.id }
  );
}

export function notifyMatchAccepted(player) {
  scheduleLocalNotification(
    "You're set to play!",
    `${player.name} accepted your request. Say hi!`,
    { type: NOTIF_TYPES.MATCH_ACCEPTED, playerId: player.id },
    2
  );
}

export function notifyMessage(fromPlayer, preview) {
  scheduleLocalNotification(
    fromPlayer.name,
    preview ? (preview.length > 80 ? preview.slice(0, 77) + '…' : preview) : 'Sent you a message',
    { type: NOTIF_TYPES.MESSAGE, playerId: fromPlayer.id }
  );
}

export function notifyCourtBoardReply(fromPlayer) {
  scheduleLocalNotification(
    `${fromPlayer.name} is in!`,
    'Someone replied to your court board post.',
    { type: NOTIF_TYPES.COURT_BOARD_REPLY }
  );
}

export function notifyCommunityPost(communityName, authorName) {
  scheduleLocalNotification(
    communityName,
    `${authorName} posted something new.`,
    { type: NOTIF_TYPES.COMMUNITY_POST }
  );
}
