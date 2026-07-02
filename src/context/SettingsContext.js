// App settings — privacy, notifications and linked-account state.
//
// Everything here is persisted to AsyncStorage so changes survive app restarts
// (works fully offline in demo mode). Friends/communities visibility lives on
// the profile itself (see AuthContext.updateProfile) because mockData reads it
// to gate what other players can see; the rest lives here.

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import * as api from '../lib/api';

const SettingsContext = createContext(null);

const STORAGE_KEY = 'hit.settings.v1';

export const DEFAULT_SETTINGS = {
  privacy: {
    profileVisibility: 'everyone', // 'everyone' | 'matches' | 'nobody'
    whoCanMessage: 'everyone', // 'everyone' | 'matches' | 'nobody'
    hideAge: false,
    hideDistance: false,
    showInBrowse: true, // pause discovery when false
  },
  notifications: {
    push: true, // master toggle
    matchRequests: true,
    messages: true,
    communityPosts: true,
    courtBoardReplies: true,
    appUpdates: false,
  },
  account: {},
};

// Deep-merge persisted values onto defaults so new keys always exist.
function mergeSettings(saved) {
  if (!saved || typeof saved !== 'object') return DEFAULT_SETTINGS;
  return {
    privacy: { ...DEFAULT_SETTINGS.privacy, ...(saved.privacy || {}) },
    notifications: { ...DEFAULT_SETTINGS.notifications, ...(saved.notifications || {}) },
    account: { ...DEFAULT_SETTINGS.account, ...(saved.account || {}) },
  };
}

export function SettingsProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [hydrated, setHydrated] = useState(false);

  // Local cache first (instant, offline-friendly).
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setSettings(mergeSettings(JSON.parse(raw)));
      } catch (e) {
        // ignore corrupt storage
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  // When signed in to Supabase, pull the authoritative copy and merge it in.
  useEffect(() => {
    if (!isAuthenticated) return;
    (async () => {
      const remote = await api.getSettings();
      if (remote) {
        setSettings((prev) => mergeSettings({ ...prev, ...remote }));
      }
    })();
  }, [isAuthenticated]);

  function persist(next) {
    setSettings(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  }

  // Patch one section, e.g. update('privacy', { hideAge: true }).
  function update(section, patch) {
    const nextSection = { ...settings[section], ...patch };
    persist({ ...settings, [section]: nextSection });
    // Sync the full section to Supabase (jsonb column) when live.
    api.saveSettings(section, nextSection);
  }

  function resetSettings() {
    persist(DEFAULT_SETTINGS);
  }

  const value = useMemo(
    () => ({ settings, hydrated, update, resetSettings }),
    [settings, hydrated]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within a SettingsProvider');
  return ctx;
}

export default SettingsContext;
