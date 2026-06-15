// Active-location state for the whole app.
//
// The active location drives what Browse, Court Board and Communities show.
// Resolution order (per product spec):
//   1. the location the user has explicitly chosen (persisted),
//   2. their registered profile city,
//   3. a device-geolocation suggestion (expo-location, with permission),
//   4. otherwise null → the UI prompts the user to pick one.
//
// Coordinates power real PostGIS distance search. We resolve them in this order:
//   1. explicit pick coords (the chosen city, geocoded),
//   2. fresh device-GPS coords (refreshed in the background on every app open),
//   3. the profile's stored lat/lng,
//   4. otherwise null → distance filtering is unavailable.
//
// On every authenticated launch we ask for location permission (the OS shows the
// friendly reason from app.json), read GPS, and save it to the Supabase profile
// so distance stays current. If permission is denied we geocode the user's
// manually-entered city instead so distance still works.
//
// IMPORTANT: there is no hardcoded "Austin, TX" default anywhere. Austin only
// appears as the seed demo user's registered city.

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { useAuth } from './AuthContext';

const LocationContext = createContext(null);
const STORAGE_KEY = 'hit.location.v1';

// Turn an expo-location reverse-geocode result into a "City, Region" label.
function placeToLabel(place) {
  if (!place) return null;
  const city = place.city || place.subregion || place.district;
  const region = place.region || place.country;
  const label = [city, region].filter(Boolean).join(', ');
  return label || null;
}

export function LocationProvider({ children }) {
  const { profile, isAuthenticated, updateProfile } = useAuth();
  const [activeLocation, setActive] = useState(null);
  const [activeCoords, setActiveCoords] = useState(null); // explicit-pick coords { lat, lng }
  const [deviceCoords, setDeviceCoords] = useState(null); // latest GPS reading { lat, lng }
  const [savedLocations, setSaved] = useState([]);
  const [detecting, setDetecting] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const refreshedRef = useRef(false);

  // Hydrate persisted state once on boot.
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.active) setActive(parsed.active);
          if (parsed.coords) setActiveCoords(parsed.coords);
          if (Array.isArray(parsed.saved)) setSaved(parsed.saved);
        }
      } catch (e) {
        // ignore corrupt storage
      }
      setHydrated(true);
    })();
  }, []);

  // Once hydrated, if we still have no active location, fall back to the
  // registered profile city (step 2 of the resolution order).
  useEffect(() => {
    if (!hydrated) return;
    if (!activeLocation && profile?.city) {
      setActive(profile.city);
      setSaved((prev) => (prev.includes(profile.city) ? prev : [profile.city, ...prev]));
    }
  }, [hydrated, profile?.city]); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist whenever active/saved change (after hydration).
  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ active: activeLocation, coords: activeCoords, saved: savedLocations })
    ).catch(() => {});
  }, [hydrated, activeLocation, activeCoords, savedLocations]);

  // Forward-geocode a "City, Region" label into coordinates (no permission
  // needed). Used so a manually-picked city still drives distance search.
  const geocodeCity = useCallback(async (label) => {
    if (!label) return null;
    try {
      const [g] = await Location.geocodeAsync(label);
      if (g && g.latitude != null && g.longitude != null) {
        return { lat: g.latitude, lng: g.longitude };
      }
    } catch (e) {
      // geocoder unavailable / no match
    }
    return null;
  }, []);

  // Persist coordinates (and, if the profile has no city yet, a city label) to
  // the user's profile so distance stays current across sessions/devices.
  const persistCoordsToProfile = useCallback(
    (coords, label) => {
      if (!coords || !isAuthenticated || !updateProfile) return;
      // Skip a redundant write if nothing meaningful changed.
      const sameCoords =
        profile?.lat != null &&
        profile?.lng != null &&
        Math.abs(profile.lat - coords.lat) < 0.0005 &&
        Math.abs(profile.lng - coords.lng) < 0.0005;
      if (sameCoords && profile?.city) return;
      const patch = { lat: coords.lat, lng: coords.lng };
      if (label && !profile?.city) patch.city = label;
      updateProfile(patch);
    },
    [isAuthenticated, updateProfile, profile?.lat, profile?.lng, profile?.city]
  );

  // Read device GPS and apply it. `makeActive` forces the GPS location to become
  // the active selection (used by the "use my current location" button). In the
  // background pass it only fills in coords/label when the user hasn't chosen a
  // location yet, so it never overrides an explicit pick.
  const refreshFromDevice = useCallback(
    async ({ prompt = true, makeActive = false } = {}) => {
      try {
        let perm = await Location.getForegroundPermissionsAsync();
        if (perm.status !== 'granted') {
          if (prompt && perm.canAskAgain) {
            perm = await Location.requestForegroundPermissionsAsync();
          }
        }
        if (perm.status !== 'granted') {
          // Permission denied → fall back to the manually entered city's coords.
          const city = activeLocation || profile?.city;
          if (city) {
            const c = await geocodeCity(city);
            if (c) {
              setDeviceCoords(c);
              persistCoordsToProfile(c, null);
              if (makeActive) setActiveCoords(c);
            }
          }
          return null;
        }

        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setDeviceCoords(coords);

        let label = null;
        try {
          const [place] = await Location.reverseGeocodeAsync(pos.coords);
          label = placeToLabel(place);
        } catch (e) {
          // reverse geocode failed — coords are still valid
        }

        persistCoordsToProfile(coords, label);

        if (makeActive) {
          setActiveCoords(coords);
          if (label) {
            setActive(label);
            setSaved((prev) => (prev.includes(label) ? prev : [label, ...prev].slice(0, 8)));
          }
        } else if (!activeLocation && label) {
          // No explicit pick yet → reflect GPS so the header isn't blank.
          setActive(label);
          setSaved((prev) => (prev.includes(label) ? prev : [label, ...prev].slice(0, 8)));
        }
        return label;
      } catch (e) {
        return null;
      }
    },
    [activeLocation, profile?.city, geocodeCity, persistCoordsToProfile]
  );

  // Background refresh on each authenticated launch (once per session) so the
  // saved location stays current without nagging the user.
  useEffect(() => {
    if (!hydrated) return;
    if (!isAuthenticated) {
      refreshedRef.current = false;
      return;
    }
    if (refreshedRef.current) return;
    refreshedRef.current = true;
    refreshFromDevice({ prompt: true, makeActive: false });
  }, [hydrated, isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  const setActiveLocation = useCallback(
    (label, coords = null) => {
      if (!label) return;
      setActive(label);
      setSaved((prev) => (prev.includes(label) ? prev : [label, ...prev].slice(0, 8)));
      if (coords) {
        setActiveCoords(coords);
      } else {
        // Geocode the chosen city so distance search works for it. Clear stale
        // pick coords first so we fall back to GPS until the geocode resolves.
        setActiveCoords(null);
        geocodeCity(label).then((c) => {
          if (c) setActiveCoords(c);
        });
      }
    },
    [geocodeCity]
  );

  const removeSavedLocation = useCallback((label) => {
    setSaved((prev) => prev.filter((l) => l !== label));
  }, []);

  // Request device location permission and apply it as the active location.
  // Returns the resolved label (or null if unavailable/denied).
  const detectDeviceLocation = useCallback(async () => {
    setDetecting(true);
    try {
      return await refreshFromDevice({ prompt: true, makeActive: true });
    } finally {
      setDetecting(false);
    }
  }, [refreshFromDevice]);

  // Coordinates for the active location: explicit pick > fresh GPS > stored
  // profile coords > null (distance filtering disabled).
  const coords =
    activeCoords ||
    deviceCoords ||
    (profile?.lat != null && profile?.lng != null
      ? { lat: profile.lat, lng: profile.lng }
      : null);

  const value = {
    activeLocation,
    activeCoords: coords,
    savedLocations,
    detecting,
    setActiveLocation,
    removeSavedLocation,
    detectDeviceLocation,
    refreshFromDevice,
    needsLocation: hydrated && !activeLocation && !profile?.city,
  };

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}

export function useLocation() {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error('useLocation must be used inside LocationProvider');
  return ctx;
}

export default LocationContext;
