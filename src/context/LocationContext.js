// Active-location state for the whole app.
//
// The active location drives what Browse, Court Board and Communities show.
// Resolution order (per product spec):
//   1. the location the user has explicitly chosen (persisted),
//   2. their registered profile city,
//   3. a device-geolocation suggestion (expo-location, with permission),
//   4. otherwise null → the UI prompts the user to pick one.
//
// IMPORTANT: there is no hardcoded "Austin, TX" default anywhere. Austin only
// appears as the seed demo user's registered city.

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { useAuth } from './AuthContext';

const LocationContext = createContext(null);
const STORAGE_KEY = 'hit.location.v1';

export function LocationProvider({ children }) {
  const { profile } = useAuth();
  const [activeLocation, setActive] = useState(null);
  const [activeCoords, setActiveCoords] = useState(null); // { lat, lng } when known
  const [savedLocations, setSaved] = useState([]);
  const [detecting, setDetecting] = useState(false);
  const [hydrated, setHydrated] = useState(false);

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

  const setActiveLocation = useCallback((label, coords = null) => {
    if (!label) return;
    setActive(label);
    setActiveCoords(coords); // explicit picks may not carry coords → distance off until geocoded
    setSaved((prev) => (prev.includes(label) ? prev : [label, ...prev].slice(0, 8)));
  }, []);

  const removeSavedLocation = useCallback((label) => {
    setSaved((prev) => prev.filter((l) => l !== label));
  }, []);

  // Request device location permission and reverse-geocode to a city label.
  // Returns the label (and sets it active) or null if unavailable/denied.
  const detectDeviceLocation = useCallback(async () => {
    setDetecting(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return null;
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Low,
      });
      const [place] = await Location.reverseGeocodeAsync(pos.coords);
      if (!place) return null;
      const city = place.city || place.subregion || place.district;
      const region = place.region || place.country;
      const label = [city, region].filter(Boolean).join(', ');
      if (label) {
        setActive(label);
        setActiveCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setSaved((prev) => (prev.includes(label) ? prev : [label, ...prev].slice(0, 8)));
        return label;
      }
      return null;
    } catch (e) {
      return null;
    } finally {
      setDetecting(false);
    }
  }, []);

  // Coordinates for the active location: explicit device coords, else the
  // signed-in profile's stored coords, else null (distance filtering disabled).
  const coords = activeCoords || (profile?.lat != null && profile?.lng != null
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
