// Location search service.
//
// Resolution order for a typed query:
//   1. Google Places Autocomplete — only if EXPO_PUBLIC_GOOGLE_PLACES_API_KEY
//      is set (optional; needs a billed Google Cloud project).
//   2. The bundled offline city list — fast prefix matching on major cities.
//   3. The DEVICE's own geocoder (expo-location) — free, needs no API key and
//      no location permission, and resolves small towns the bundled list
//      misses (e.g. "Union City, CA"). This is what makes arbitrary cities
//      work without any paid service.
//
// Results are always { id, label } and may carry { coords } when we already
// know them, so callers can skip a second geocode.

import * as Location from 'expo-location';
import { searchWorldCities } from './worldCities';

const GOOGLE_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;
export const usingGooglePlaces = Boolean(GOOGLE_KEY);

const AUTOCOMPLETE_URL =
  'https://maps.googleapis.com/maps/api/place/autocomplete/json';

// Turn a reverse-geocode result into a canonical "City, Region" label.
function placeToLabel(place) {
  if (!place) return null;
  const city = place.city || place.subregion || place.district;
  const region = place.region || place.country;
  const label = [city, region].filter(Boolean).join(', ');
  return label || null;
}

// Ask the device to resolve free-typed text into a real place. Forward-geocode
// to coordinates, then reverse-geocode those coordinates to get a properly
// formatted label, so two people typing the same town end up with identical
// labels (which is what makes same-city matching work).
async function geocodeOnDevice(query) {
  try {
    const [hit] = await Location.geocodeAsync(query);
    if (!hit || hit.latitude == null || hit.longitude == null) return null;
    const coords = { lat: hit.latitude, lng: hit.longitude };
    let label = null;
    try {
      const [place] = await Location.reverseGeocodeAsync({
        latitude: hit.latitude,
        longitude: hit.longitude,
      });
      label = placeToLabel(place);
    } catch (e) {
      // Reverse geocode failed — coordinates are still usable.
    }
    if (!label) return null;
    return { id: `device:${label}`, label, coords };
  } catch (e) {
    // Geocoder unavailable or no match.
    return null;
  }
}

async function searchGoogle(q, signal) {
  try {
    const url =
      `${AUTOCOMPLETE_URL}?input=${encodeURIComponent(q)}` +
      `&types=(cities)&key=${GOOGLE_KEY}`;
    const res = await fetch(url, { signal });
    const json = await res.json();
    if (json.status === 'OK' && Array.isArray(json.predictions)) {
      return json.predictions.map((p) => ({ id: p.place_id, label: p.description }));
    }
  } catch (e) {
    if (e.name === 'AbortError') return [];
    // Network/quota error → fall through to the other sources.
  }
  return [];
}

// Search for places matching `query`. Returns a promise of { id, label }[].
export async function searchPlaces(query, { signal } = {}) {
  const q = (query || '').trim();
  if (q.length < 2) return [];

  const out = [];
  const seen = new Set();
  const add = (item) => {
    if (!item || seen.has(item.label)) return;
    seen.add(item.label);
    out.push(item);
  };

  if (usingGooglePlaces) {
    (await searchGoogle(q, signal)).forEach(add);
  }

  // Offline list — instant matches for well-known cities.
  searchWorldCities(q).forEach((label) => add({ id: label, label }));

  // Nothing recognised yet? Let the device geocoder try, so small towns and
  // neighbourhoods still resolve. Only worth doing once the query is long
  // enough to be a real place name rather than a couple of letters.
  if (out.length === 0 && q.length >= 3) {
    add(await geocodeOnDevice(q));
  }

  return out;
}

export default { searchPlaces, usingGooglePlaces };
