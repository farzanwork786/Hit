// Push notification context.
// Requests permissions on first login, stores the push token, and sets up
// foreground + tap listeners. Exposes a badge count that increments on receive.
//
// When backend is connected: wire responseListener to navigate to the
// relevant screen based on notification.request.content.data.type.

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import * as Notifications from 'expo-notifications';
import { registerForPushNotifications } from '../lib/notifications';
import { useAuth } from './AuthContext';
import * as api from '../lib/api';

const PushContext = createContext({ pushToken: null, badge: 0, clearBadge: () => {} });

export function PushProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [pushToken, setPushToken] = useState(null);
  const [badge, setBadge] = useState(0);
  const receivedRef = useRef(null);
  const responseRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    registerForPushNotifications().then((token) => {
      setPushToken(token);
      // Persist the Expo push token so the backend trigger can target this
      // device when someone messages or sends this user a play request.
      if (token) api.savePushToken(token);
    });

    // Badge bump whenever a notification arrives while the app is open.
    receivedRef.current = Notifications.addNotificationReceivedListener(() => {
      setBadge((b) => b + 1);
    });

    // User tapped a notification — navigate to the right screen.
    // TODO (backend): destructure data.type + data.playerId, use a navigation
    // ref to push the appropriate screen (ChatDetail, PlayerProfile, etc.).
    responseRef.current = Notifications.addNotificationResponseReceivedListener((_response) => {
      // const { type, playerId } = _response.notification.request.content.data ?? {};
      // if (type === NOTIF_TYPES.MESSAGE) navRef.current?.navigate('ChatDetail', ...);
    });

    return () => {
      receivedRef.current?.remove();
      responseRef.current?.remove();
    };
  }, [isAuthenticated]);

  return (
    <PushContext.Provider value={{ pushToken, badge, clearBadge: () => setBadge(0) }}>
      {children}
    </PushContext.Provider>
  );
}

export const usePush = () => useContext(PushContext);
