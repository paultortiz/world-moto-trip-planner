/**
 * Country detection utilities using Google Maps Geocoding API.
 */

export interface CountryInfo {
  code: string; // ISO 3166-1 alpha-2 (e.g., "US", "MX", "CA")
  name: string; // Full name (e.g., "United States", "Mexico", "Canada")
}

export interface WaypointWithCountry {
  lat: number;
  lng: number;
  name?: string | null;
  country?: CountryInfo;
}

export interface CountryTransition {
  fromCountry: CountryInfo;
  toCountry: CountryInfo;
  atWaypointIndex: number;
  waypointName?: string | null;
}

/**
 * Detect the country for a single coordinate using Google Maps Geocoding API.
 * This should be called from the client side where google.maps is available.
 */
export async function detectCountryForCoordinate(
  lat: number,
  lng: number,
  geocoder: google.maps.Geocoder
): Promise<CountryInfo | null> {
  return new Promise((resolve) => {
    geocoder.geocode(
      { location: { lat, lng } },
      (results, status) => {
        if (status !== "OK" || !results || results.length === 0) {
          resolve(null);
          return;
        }

        // Find the country component
        for (const result of results) {
          for (const component of result.address_components) {
            if (component.types.includes("country")) {
              resolve({
                code: component.short_name,
                name: component.long_name,
              });
              return;
            }
          }
        }

        resolve(null);
      }
    );
  });
}

/**
 * Detect countries for multiple waypoints.
 * Uses batching to avoid rate limits - processes sequentially with small delays.
 */
export async function detectCountriesForWaypoints(
  waypoints: { lat: number; lng: number; name?: string | null }[],
  geocoder: google.maps.Geocoder,
  onProgress?: (completed: number, total: number) => void
): Promise<WaypointWithCountry[]> {
  const results: WaypointWithCountry[] = [];
  
  // Cache to avoid re-geocoding the same approximate location
  const countryCache = new Map<string, CountryInfo | null>();
  
  for (let i = 0; i < waypoints.length; i++) {
    const wp = waypoints[i];
    
    // Create a cache key based on rounded coordinates (about 1km precision)
    const cacheKey = `${wp.lat.toFixed(2)},${wp.lng.toFixed(2)}`;
    
    let country: CountryInfo | null;
    if (countryCache.has(cacheKey)) {
      country = countryCache.get(cacheKey) ?? null;
    } else {
      country = await detectCountryForCoordinate(wp.lat, wp.lng, geocoder);
      countryCache.set(cacheKey, country);
      
      // Small delay between API calls to avoid rate limiting
      if (i < waypoints.length - 1) {
        await new Promise((r) => setTimeout(r, 100));
      }
    }
    
    results.push({
      lat: wp.lat,
      lng: wp.lng,
      name: wp.name,
      country: country ?? undefined,
    });
    
    onProgress?.(i + 1, waypoints.length);
  }
  
  return results;
}

/**
 * Find country transitions (border crossings) along a route.
 * Returns an array of transitions where the country changes between consecutive waypoints.
 */
export function findCountryTransitions(
  waypoints: WaypointWithCountry[]
): CountryTransition[] {
  const transitions: CountryTransition[] = [];
  
  for (let i = 1; i < waypoints.length; i++) {
    const prev = waypoints[i - 1];
    const curr = waypoints[i];
    
    // Skip if either waypoint doesn't have country info
    if (!prev.country || !curr.country) continue;
    
    // Check if country changed
    if (prev.country.code !== curr.country.code) {
      transitions.push({
        fromCountry: prev.country,
        toCountry: curr.country,
        atWaypointIndex: i,
        waypointName: curr.name,
      });
    }
  }
  
  return transitions;
}

/**
 * Get unique countries in route order (each country appears at most once).
 */
export function getUniqueCountriesInOrder(
  waypoints: WaypointWithCountry[]
): CountryInfo[] {
  const seen = new Set<string>();
  const countries: CountryInfo[] = [];
  
  for (const wp of waypoints) {
    if (wp.country && !seen.has(wp.country.code)) {
      seen.add(wp.country.code);
      countries.push(wp.country);
    }
  }
  
  return countries;
}

/**
 * Get unique country pairs (for caching requirements lookups).
 * Returns pairs in the order they occur along the route.
 */
export function getCountryPairs(
  transitions: CountryTransition[]
): Array<{ from: string; to: string; fromName: string; toName: string }> {
  const pairs: Array<{ from: string; to: string; fromName: string; toName: string }> = [];
  const seen = new Set<string>();
  
  for (const t of transitions) {
    const key = `${t.fromCountry.code}-${t.toCountry.code}`;
    if (!seen.has(key)) {
      seen.add(key);
      pairs.push({
        from: t.fromCountry.code,
        to: t.toCountry.code,
        fromName: t.fromCountry.name,
        toName: t.toCountry.name,
      });
    }
  }
  
  return pairs;
}
