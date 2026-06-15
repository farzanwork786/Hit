// Global sport context — switches the whole app between Tennis and Pickleball.
// Browse, Court Board and Communities all read the current sport from here.
//
// The set of sports the user plays is derived from their actual profile (the
// registered account), falling back to the demo seed user. A single-sport user
// defaults to their sport and the toggle renders as a subtle static chip.

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import { currentUser } from '../lib/mockData';
import { SPORT_KEYS } from '../lib/ratings';

const SportContext = createContext(null);

// Profiles store sports as an object (players) or array of keys (communities).
function sportsFromProfile(profile) {
  const src = profile?.sports;
  if (Array.isArray(src)) return SPORT_KEYS.filter((s) => src.includes(s));
  if (src && typeof src === 'object') return SPORT_KEYS.filter((s) => src[s]);
  return SPORT_KEYS.filter((s) => currentUser.sports?.[s]);
}

export function SportProvider({ children }) {
  const { profile } = useAuth();
  const mySports = useMemo(() => {
    const list = sportsFromProfile(profile);
    return list.length ? list : ['tennis'];
  }, [profile]);

  const [sport, setSport] = useState(mySports[0]);

  // Keep the active sport valid as the user's sports change (e.g. after
  // registration or editing their profile).
  useEffect(() => {
    if (!mySports.includes(sport)) setSport(mySports[0]);
  }, [mySports]); // eslint-disable-line react-hooks/exhaustive-deps

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
