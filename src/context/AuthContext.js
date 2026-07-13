// Authentication + session state.
//
// Backed by Supabase when configured; otherwise it runs in a "demo" mode so the
// full app is navigable without a backend. Onboarding progress (age gate,
// account type, registration data) is tracked here and persisted to
// AsyncStorage so the user lands in the right place on relaunch.

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured, friendlyError } from '../lib/supabase';
import * as api from '../lib/api';
import { currentUser as mockUser } from '../lib/mockData';

const AuthContext = createContext(null);

const STORAGE_KEYS = {
  onboarding: 'hit.onboarding.v1',
  profile: 'hit.profile.v1',
};

const DEFAULT_ONBOARDING = {
  ageVerified: false,
  accountType: null, // 'self' | 'community'
  registered: false,
  draft: {}, // partial registration data between steps
  pendingProfile: null, // profile to flush to Supabase once a session exists
};

export function AuthProvider({ children }) {
  const [initializing, setInitializing] = useState(true);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const onboardingRef = useRef(DEFAULT_ONBOARDING);

  // Onboarding flags persisted across launches.
  const [onboarding, setOnboarding] = useState(DEFAULT_ONBOARDING);
  onboardingRef.current = onboarding;

  // Load persisted onboarding state + profile + any Supabase session on boot.
  useEffect(() => {
    let sub;
    (async () => {
      let ob = null;
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEYS.onboarding);
        if (raw) {
          ob = JSON.parse(raw);
          setOnboarding((prev) => ({ ...prev, ...ob }));
        }
      } catch (e) {
        // ignore corrupt storage
      }

      // Demo mode: rehydrate the persisted profile so edits survive restarts.
      if (!isSupabaseConfigured) {
        try {
          const rawProfile = await AsyncStorage.getItem(STORAGE_KEYS.profile);
          if (rawProfile && ob?.registered) {
            const saved = JSON.parse(rawProfile);
            Object.assign(mockUser, saved);
            setProfile(saved);
            setSession({ user: { id: 'demo-user', email: saved.email || 'demo@hit.app' } });
          }
        } catch (e) {
          // ignore corrupt storage
        }
        setInitializing(false);
        return;
      }

      // Live mode.
      const { data } = await supabase.auth.getSession();
      setSession(data?.session ?? null);
      if (data?.session) await onSignedIn(data.session.user.id);

      const { data: subData } = supabase.auth.onAuthStateChange((_event, s) => {
        setSession(s);
        if (s) onSignedIn(s.user.id);
        else setProfile(null);
      });
      sub = subData;
      setInitializing(false);
    })();
    return () => sub?.subscription?.unsubscribe();
  }, []);

  const persistOnboarding = useCallback(async (next) => {
    setOnboarding(next);
    onboardingRef.current = next;
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.onboarding, JSON.stringify(next));
    } catch (e) {
      // ignore
    }
  }, []);

  // Demo mode only: persist the active profile so edits survive app restarts.
  const persistProfile = useCallback(async (next) => {
    if (isSupabaseConfigured) return;
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(next));
    } catch (e) {
      // ignore
    }
  }, []);

  // Called whenever we have an authenticated session: flush any pending profile
  // (from a signup that happened before the session existed) then load it.
  async function onSignedIn(userId) {
    const ob = onboardingRef.current;
    if (ob?.pendingProfile) {
      await api.saveProfile(userId, ob.pendingProfile);
      if (ob.pendingProfile.isCommunity) {
        await ensureCommunity(userId, ob.pendingProfile);
      }
      await persistOnboarding({ ...ob, pendingProfile: null });
    }
    await loadProfile(userId);
  }

  async function loadProfile(userId) {
    if (!isSupabaseConfigured) return;
    const p = await api.getProfile(userId);
    if (p) setProfile(p);
  }

  // Best-effort: create the community page + owner membership for a community
  // account. Failures are non-fatal (the profile still exists).
  async function ensureCommunity(userId, meta) {
    try {
      const { data: existing } = await supabase
        .from('communities')
        .select('id')
        .eq('owner_id', userId)
        .limit(1);
      if (existing && existing.length) return;
      const { data: com } = await supabase
        .from('communities')
        .insert({
          owner_id: userId,
          name: meta.name,
          photo: meta.photo,
          cover: meta.cover || meta.photo,
          description: meta.bio,
          city: meta.city,
          sports: Array.isArray(meta.sports) ? meta.sports : [],
        })
        .select('id')
        .single();
      if (com?.id) {
        await supabase
          .from('community_members')
          .insert({ community_id: com.id, user_id: userId, role: 'owner' });
      }
    } catch (e) {
      // ignore — non-fatal
    }
  }

  // --- Onboarding actions -------------------------------------------------
  const verifyAge = () => persistOnboarding({ ...onboarding, ageVerified: true });
  const setAccountType = (type) => persistOnboarding({ ...onboarding, accountType: type });
  const updateDraft = (patch) =>
    persistOnboarding({ ...onboarding, draft: { ...onboarding.draft, ...patch } });

  // --- Auth actions -------------------------------------------------------
  async function signUp({ email, password, ...meta }) {
    if (!isSupabaseConfigured) {
      const next = { ...(meta.isCommunity ? {} : mockUser), email, ...meta };
      if (!meta.isCommunity) Object.assign(mockUser, next);
      setProfile(next);
      await persistProfile(next);
      await persistOnboarding({ ...onboarding, registered: true, draft: {} });
      setSession({ user: { id: 'demo-user', email } });
      return { error: null };
    }

    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: { message: friendlyError(error) } };

    const uid = data.user?.id;
    const profileMeta = { email, ...meta };

    if (data.session && uid) {
      // Confirmation off → session is live; save profile immediately.
      await api.saveProfile(uid, profileMeta);
      if (meta.isCommunity) await ensureCommunity(uid, profileMeta);
      await persistOnboarding({ ...onboarding, registered: true, draft: {}, pendingProfile: null });
      return { error: null };
    }

    // Confirmation on → no session yet. Stash the profile to flush on first
    // sign-in, mark registered, and let the UI know to check email.
    await persistOnboarding({
      ...onboarding,
      registered: true,
      draft: {},
      pendingProfile: profileMeta,
    });
    return { error: null, needsConfirmation: true };
  }

  async function signIn({ email, password }) {
    if (!isSupabaseConfigured) {
      const next = { ...mockUser, email };
      Object.assign(mockUser, next);
      setProfile(next);
      await persistProfile(next);
      setSession({ user: { id: 'demo-user', email } });
      return { error: null };
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: { message: friendlyError(error) } };
    return { error: null };
  }

  async function signOut() {
    if (isSupabaseConfigured) await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    await persistOnboarding({ ...DEFAULT_ONBOARDING });
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.profile);
    } catch (e) {
      // ignore
    }
  }

  async function deleteAccount() {
    // Real account row deletion needs a privileged server call; here we sign out
    // and clear local state. (A Supabase Edge Function can hard-delete later.)
    await signOut();
  }

  async function completeDemoOnboarding(draft) {
    const base = draft?.isCommunity ? {} : mockUser;
    const next = { ...base, ...draft };
    if (!draft?.isCommunity) Object.assign(mockUser, next);
    setProfile(next);
    await persistProfile(next);
    await persistOnboarding({ ...onboarding, registered: true, draft: {} });
    setSession({ user: { id: 'demo-user', email: draft?.email || 'demo@hit.app' } });
  }

  // Merge a patch into the current profile (Edit Profile / Settings). Reflected
  // app-wide immediately; persisted to Supabase when live, AsyncStorage in demo.
  async function updateProfile(patch) {
    setProfile((prev) => {
      const next = { ...(prev || mockUser), ...patch };
      if (!isSupabaseConfigured) {
        Object.assign(mockUser, patch);
        persistProfile(next);
      }
      return next;
    });
    if (isSupabaseConfigured && session?.user?.id) {
      const { ok, error } = await api.saveProfile(session.user.id, patch);
      if (!ok) return { error: { message: friendlyError(error) } };
    }
    return { error: null };
  }

  const value = {
    initializing,
    session,
    profile: profile || (session ? mockUser : null),
    isAuthenticated: Boolean(session),
    isSupabaseConfigured,
    onboarding,
    verifyAge,
    setAccountType,
    updateDraft,
    signUp,
    signIn,
    signOut,
    deleteAccount,
    completeDemoOnboarding,
    updateProfile,
    refreshProfile: () => session?.user?.id && loadProfile(session.user.id),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}

export default AuthContext;
