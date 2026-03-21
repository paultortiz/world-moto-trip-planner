/**
 * CBSA (Canada Border Services Agency) wait time parsing.
 *
 * Fetches and parses the public CBSA CSV for entering-Canada border wait times.
 * CSV URL: https://www.cbsa-asfc.gc.ca/bwt-taf/bwt-eng.csv
 *
 * The CSV is semicolon-delimited with columns:
 *   Office;; Location;; Last updated;; Commercial Canada-bound;; Commercial US-bound;;
 *   Travellers Canada-bound;; Travellers US-bound;;
 */

import { haversineDistanceKm } from "./borderCrossings";

export interface CBSAPort {
  officeName: string;
  location: string;
  lastUpdated: string;
  commercialCanadaBound: string;
  travellersCanadaBound: string;
  /** Parsed delay in minutes, or null if unavailable */
  travellersWaitMinutes: number | null;
  /** Coordinates for distance matching */
  lat?: number;
  lng?: number;
}

/**
 * Known CBSA port coordinates for the 29 busiest crossings.
 * Keyed by the office name as it appears in the CSV (case-insensitive matching).
 */
export const CBSA_PORT_COORDINATES: Record<string, { lat: number; lng: number }> = {
  // East to West (matching CSV order)
  "st. stephen": { lat: 45.1917, lng: -67.2783 },
  "st. stephen 3rd bridge": { lat: 45.1811, lng: -67.2694 },
  "edmundston": { lat: 47.3556, lng: -68.3317 },
  "woodstock road": { lat: 46.1261, lng: -67.8342 },
  "stanstead": { lat: 45.0058, lng: -72.1086 },
  "st-armand/philipsburg": { lat: 45.0163, lng: -73.0831 },
  "lacolle: route 223": { lat: 45.0833, lng: -73.3667 },
  "lacolle: route 221": { lat: 45.0833, lng: -73.3667 },
  "st-bernard-de-lacolle": { lat: 44.9860, lng: -73.4500 },
  "hemmingford": { lat: 45.0667, lng: -73.6000 },
  "cornwall traffic office": { lat: 45.0132, lng: -74.7307 },
  "prescott": { lat: 44.7167, lng: -75.5167 },
  "thousand islands bridge": { lat: 44.3536, lng: -75.9791 },
  "sault ste. marie": { lat: 46.5136, lng: -84.3472 },
  "fort frances bridge": { lat: 48.6011, lng: -93.4103 },
  "queenston-lewiston bridge": { lat: 43.1456, lng: -79.0398 },
  "rainbow bridge": { lat: 43.0926, lng: -79.0460 },
  "peace bridge": { lat: 42.9065, lng: -78.9039 },
  "blue water bridge": { lat: 42.9988, lng: -82.4240 },
  "windsor and detroit tunnel": { lat: 42.3200, lng: -83.0400 },
  "ambassador bridge": { lat: 42.3110, lng: -83.0750 },
  "emerson": { lat: 49.0006, lng: -97.2383 },
  "north portal": { lat: 49.0000, lng: -102.5500 },
  "coutts": { lat: 48.9989, lng: -111.9561 },
  "abbotsford-huntingdon": { lat: 49.0021, lng: -122.2651 },
  "aldergrove": { lat: 49.0000, lng: -122.4700 },
  "pacific highway": { lat: 49.0021, lng: -122.7340 },
  "douglas": { lat: 49.0023, lng: -122.7564 },
  "boundary bay": { lat: 48.9881, lng: -123.0582 },
};

const CBSA_CSV_URL = "https://www.cbsa-asfc.gc.ca/bwt-taf/bwt-eng.csv";

/**
 * Parse a CBSA wait time string like "5 minutes", "No Delay", "Not Applicable"
 * into a number of minutes or null.
 */
export function parseCBSAWaitString(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed || trimmed === "--" || trimmed === "Not Applicable" || trimmed === "N/A") {
    return null;
  }
  if (trimmed === "No Delay" || trimmed === "0 minutes") {
    return 0;
  }
  // Match patterns like "5 minutes", "15 minutes", "1 minute"
  const match = trimmed.match(/^(\d+)\s*minute/i);
  if (match) {
    return parseInt(match[1], 10);
  }
  return null;
}

/**
 * Parse the CBSA CSV text into an array of CBSAPort objects.
 */
export function parseCBSACSV(csvText: string): CBSAPort[] {
  const ports: CBSAPort[] = [];

  // Split into lines, skip BOM and header rows
  const lines = csvText
    .replace(/^\uFEFF/, "") // strip BOM
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // First two lines are the header rows, skip them
  // Line 0: column names, Line 1: sub-headers
  // Actual data starts at line 2 (index 2)
  // But the CSV has a single header line followed by data
  // The header contains "Customs Office" - skip lines containing it
  for (const line of lines) {
    if (line.toLowerCase().includes("customs office") || line.toLowerCase().includes("travellers flow")) {
      continue;
    }

    // Split by ";;" delimiter (CBSA uses double-semicolon)
    const parts = line.split(";;").map((p) => p.trim());
    if (parts.length < 6) continue;

    const officeName = parts[0];
    const location = parts[1];
    const lastUpdated = parts[2];
    const commercialCanadaBound = parts[3];
    // parts[4] = Commercial US-bound (we don't need this)
    const travellersCanadaBound = parts[5];
    // parts[6] = Travellers US-bound (we don't need this)

    if (!officeName) continue;

    // Look up coordinates
    const coordKey = officeName.toLowerCase();
    const coords = CBSA_PORT_COORDINATES[coordKey];

    ports.push({
      officeName,
      location,
      lastUpdated,
      commercialCanadaBound,
      travellersCanadaBound,
      travellersWaitMinutes: parseCBSAWaitString(travellersCanadaBound),
      lat: coords?.lat,
      lng: coords?.lng,
    });
  }

  return ports;
}

// In-memory cache
let cachedPorts: CBSAPort[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch CBSA wait times, with 5-minute in-memory cache.
 */
export async function fetchCBSAWaitTimes(): Promise<CBSAPort[]> {
  const now = Date.now();
  if (cachedPorts && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedPorts;
  }

  const response = await fetch(CBSA_CSV_URL, {
    headers: {
      "User-Agent": "WorldMotoTripPlanner/1.0",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`CBSA CSV fetch failed: ${response.status} ${response.statusText}`);
  }

  const csvText = await response.text();
  cachedPorts = parseCBSACSV(csvText);
  cacheTimestamp = now;
  return cachedPorts;
}

/**
 * Find the closest CBSA port to given coordinates.
 * Returns null if no port within maxDistanceKm.
 */
export function findClosestCBSAPort(
  lat: number,
  lng: number,
  ports: CBSAPort[],
  maxDistanceKm: number = 75
): { port: CBSAPort; distanceKm: number } | null {
  let closest: { port: CBSAPort; distanceKm: number } | null = null;

  for (const port of ports) {
    if (port.lat == null || port.lng == null) continue;

    const distance = haversineDistanceKm(lat, lng, port.lat, port.lng);
    if (distance <= maxDistanceKm) {
      if (!closest || distance < closest.distanceKm) {
        closest = { port, distanceKm: distance };
      }
    }
  }

  return closest;
}
