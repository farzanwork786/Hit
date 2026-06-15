// Supabase client configuration.
//
// Credentials come from EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY
// in the .env file. When those are missing — or Supabase is unreachable — the
// app falls back to local mock data so the full UI stays usable offline.

import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// True when real Supabase credentials are configured.
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// When not configured we export null so callers fall back to mock data.
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
      realtime: {
        params: { eventsPerSecond: 5 },
      },
    })
  : null;

// --- Reachability cache -----------------------------------------------------
// We don't want every screen hammering the network when the backend is down.
// Once a call fails with a transport error we remember it briefly so reads can
// fall back to mock data quickly; we re-probe after a short cooldown.
let _reachable = isSupabaseConfigured ? true : false;
let _lastFailAt = 0;
const COOLDOWN_MS = 15000;

export function markUnreachable() {
  _reachable = false;
  _lastFailAt = Date.now();
}
export function markReachable() {
  _reachable = true;
  _lastFailAt = 0;
}

// Whether we should attempt a live Supabase call right now.
export function shouldTryLive() {
  if (!isSupabaseConfigured) return false;
  if (_reachable) return true;
  // Cooldown elapsed → allow one more probe.
  if (Date.now() - _lastFailAt > COOLDOWN_MS) return true;
  return false;
}

// True only for transport/network failures (so we keep mock-fallback for those
// but surface real query/permission errors to the user).
export function isNetworkError(error) {
  if (!error) return false;
  const msg = (error.message || '').toLowerCase();
  return (
    msg.includes('network request failed') ||
    msg.includes('failed to fetch') ||
    msg.includes('timeout') ||
    msg.includes('fetch failed') ||
    error.name === 'AbortError'
  );
}

// Turn a Supabase/Postgrest error into a short, human-friendly message.
export function friendlyError(error, fallback = 'Something went wrong. Please try again.') {
  if (!error) return fallback;
  const msg = error.message || '';
  if (isNetworkError(error)) return "Can't reach the server. Check your connection.";
  if (msg.includes('duplicate key')) return 'That already exists.';
  if (msg.includes('row-level security')) return "You don't have permission to do that.";
  if (msg.includes('Invalid login credentials')) return 'Wrong email or password.';
  if (msg.includes('already registered')) return 'That email is already registered.';
  if (msg.includes('Password should be')) return 'Password must be at least 6 characters.';
  if (msg.includes('Email not confirmed')) return 'Please confirm your email, then sign in.';
  return msg || fallback;
}

export default supabase;
