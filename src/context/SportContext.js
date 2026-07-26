// Global sport context — switches the whole app between Tennis and Pickleball.
// Browse, Court Board and Communities all read the current sport from here.
//
// The set of sports the user plays is derived from their actual profile. It
// never falls back to demo data; an unknown profile just defaults to tennis,
// and anyone can switch freely with the toggle.

import React, { createContext, useContext, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import { SPORT_KEYS } from '../lib/ratings';

const SportContext = createContext(null);

// Profiles store sports as an object (players) or array of keys (communities).
function sportsFromProfile(profile) {
  const src = profile?.sports;
  if (Array.isArray(src)) return SPORT_KEYS.filter((s) => src.includes(s));
  if (src && typeof src === 'object') return SPORT_KEYS.filter((s) => src[s]);
  return [];
}

export function SportProvider({ children }) {
  const { profile } = useAuth();
  const mySports = useMemo(() => {
    const list = sportsFromProfile(profile);
    return list.length ? list : ['tennis'];
  }, [profile]);

  // Default to the user's primary sport, but anyone can switch freely between
  // tennis and pickleball via the toggle — we don't force the active sport back
  // to their profile sports.
  const [sport, setSport] = useState(mySports[0]);

  const value = useMemo(
    () => ({
      sport,
      setSport,
      mySports,
      playsBoth: mySports.length > 1,
    }),
    [sport, mySports]
  );

  return <SportContext.Provider value={value}>{children}</SportContext.Provider>;
}

export function useSport() {
  const ctx = useContext(SportContext);
  if (!ctx) throw new Error('useSport must be used inside SportProvider');
  return ctx;
}

export default SportContext;
