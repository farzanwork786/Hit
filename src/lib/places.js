// Location search service.
//
// When a Google Places API key is configured (EXPO_PUBLIC_GOOGLE_PLACES_API_KEY)
// this queries the Google Places Autocomplete API so ANY city/town/neighborhood
// worldwide resolves. Without a key it falls back to a large offline list so
// demo mode keeps working. Results are always { id, label } objects.

import { searchWorldCities } from './worldCities';

const GOOGLE_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;
export const usingGooglePlaces = Boolean(GOOGLE_KEY);

const AUTOCOMPLETE_URL =
  'https://maps.googleapis.com/maps/api/place/autocomplete/json';

// Search for places matching `query`. Returns a promise of { id, label }[].
export async function searchPlaces(query, { signal } = {}) {
  const q = (query || '').trim();
  if (q.length < 2) return [];

  if (usingGooglePlaces) {
    try {
      const url =
        `${AUTOCOMPLETE_URL}?input=${encodeURIComponent(q)}` +
        `&types=(cities)&key=${GOOGLE_KEY}`;
      const res = await fetch(url, { signal });
      const json = await res.json();
      if (json.status === 'OK' && Array.isArray(json.predictions)) {
        // Dedupe by label so the same city can't appear twice in suggestions.
        const seen = new Set();
        const out = [];
        for (const p of json.predictions) {
          const label = p.description;
          if (seen.has(label)) continue;
          seen.add(label);
          out.push({ id: p.place_id, label });
        }
        return out;
      }
      // On quota/error, gracefully fall back to the offline list.
    } catch (e) {
      if (e.name === 'AbortError') return [];
      // network error → fall through to offline
    }
  }

  return searchWorldCities(q).map((label) => ({ id: label, label }));
}

export default { searchPlaces, usingGooglePlaces };
