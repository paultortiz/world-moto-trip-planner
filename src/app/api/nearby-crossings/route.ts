/**
 * API endpoint to fetch nearby border crossings from Google Places.
 * 
 * GET /api/nearby-crossings?lat=XX&lng=YY&radius=50
 * 
 * - Searches Google Places for "border crossing" near the given coordinates
 * - Caches results in database with 6-month refresh
 * - Returns crossing data with photo URLs
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// Use server-side key (no referrer restrictions) or fall back to public key
const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_SERVER_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
const CACHE_DURATION_MS = 6 * 30 * 24 * 60 * 60 * 1000; // 6 months in ms

interface GooglePlaceResult {
  place_id: string;
  name: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  formatted_address?: string;
  rating?: number;
  user_ratings_total?: number;
  opening_hours?: {
    open_now?: boolean;
    weekday_text?: string[];
  };
  formatted_phone_number?: string;
  website?: string;
  photos?: Array<{
    photo_reference: string;
    height: number;
    width: number;
  }>;
  types?: string[];
}

interface PlaceDetailsResponse {
  result: GooglePlaceResult;
  status: string;
}

interface NearbySearchResponse {
  results: GooglePlaceResult[];
  status: string;
  next_page_token?: string;
}

// Build a Google Places photo URL
function getPhotoUrl(photoReference: string, maxWidth = 400): string {
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photo_reference=${photoReference}&key=${GOOGLE_API_KEY}`;
}

/**
 * Calculate distance between two points using Haversine formula
 * Returns distance in kilometers
 */
function calculateDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Types that indicate this is NOT a land border crossing
const EXCLUDED_TYPES = [
  "airport",
  "train_station",
  "transit_station",
  "bus_station",
  "subway_station",
  "seaport",  // Note: Google may not use this, but just in case
];

// Name patterns that suggest this is a real land border crossing
const LAND_CROSSING_PATTERNS = [
  /port of entry/i,
  /border crossing/i,
  /border station/i,
  /land port/i,
  /\bpoe\b/i,
  /punto de entrada/i,  // Spanish
  /garita/i,            // Spanish for checkpoint
  /aduana fronteriza/i, // Spanish for border customs
  /cruce fronterizo/i,  // Spanish for border crossing
  /\bcrossing\b/i,      // Generic crossing
];

// Name patterns that suggest this is NOT a land crossing
const EXCLUDED_NAME_PATTERNS = [
  /airport/i,
  /aeropuerto/i,
  /terminal/i,
  /\bair\b/i,
  /preclearance/i,  // Usually at airports
  /seaport/i,
  /ferry/i,
  /san francisco/i,   // Not a land border city
  /los angeles/i,     // Not a land border city  
  /seattle/i,         // Not a land border city (has port but not land)
  /new york/i,        // Not a land border city
  /chicago/i,         // Not a land border city
  /miami/i,           // Not a land border city
  /houston/i,         // Not a land border city (inland)
  /\boffice\b/i,      // Administrative offices, not crossings
  /headquarters/i,    // Administrative
  /field office/i,    // Administrative
];

// Known US-Mexico land border cities/regions (for validation)
const LAND_BORDER_REGIONS = [
  // US-Mexico border cities
  /san ysidro/i,
  /otay mesa/i,
  /tecate/i,
  /calexico/i,
  /mexicali/i,
  /nogales/i,
  /douglas/i,
  /naco/i,
  /el paso/i,
  /ciudad ju[aá]rez/i,
  /laredo/i,
  /nuevo laredo/i,
  /mcallen/i,
  /reynosa/i,
  /brownsville/i,
  /matamoros/i,
  /tijuana/i,
  /san luis/i,
  /lukeville/i,
  /sasabe/i,
  /columbus/i,
  /palomas/i,
  /del rio/i,
  /eagle pass/i,
  /piedras negras/i,
  /hidalgo/i,
  /progreso/i,
  /roma/i,
  /rio grande/i,
  // US-Canada border cities
  /blaine/i,
  /peace arch/i,
  /sumas/i,
  /lynden/i,
  /point roberts/i,
  /sweet grass/i,
  /portal/i,
  /pembina/i,
  /international falls/i,
  /sault ste/i,
  /port huron/i,
  /detroit/i,
  /windsor/i,
  /niagara/i,
  /buffalo/i,
  /champlain/i,
  /derby line/i,
  /highgate/i,
  /houlton/i,
  /calais/i,
];

/**
 * Determine if a place is likely a land border crossing
 */
function isLikelyLandCrossing(name: string, types: string[] | null | undefined, address: string | null | undefined): boolean {
  const combinedText = `${name} ${address || ""}`;
  
  // Check for excluded types (like airport)
  if (types?.some(t => EXCLUDED_TYPES.includes(t))) {
    return false;
  }
  
  // Check for excluded name patterns (airports, offices, non-border cities)
  if (EXCLUDED_NAME_PATTERNS.some(pattern => pattern.test(name))) {
    return false;
  }
  
  // Check address for airport indicators
  if (address && /airport|aeropuerto/i.test(address)) {
    return false;
  }
  
  // HIGH CONFIDENCE: Name explicitly mentions crossing/port of entry
  if (LAND_CROSSING_PATTERNS.some(pattern => pattern.test(name))) {
    return true;
  }
  
  // MEDIUM CONFIDENCE: CBP/customs office in a known border region
  if (/customs|cbp|border protection|border patrol/i.test(name)) {
    // Must be in a known land border region
    if (LAND_BORDER_REGIONS.some(pattern => pattern.test(combinedText))) {
      return true;
    }
    // Generic CBP office not in border region - exclude
    return false;
  }
  
  // Check if location is in a known border region
  if (LAND_BORDER_REGIONS.some(pattern => pattern.test(combinedText))) {
    // In border region and name suggests government/crossing facility
    if (/\b(federal|government|inspection|checkpoint)\b/i.test(name)) {
      return true;
    }
  }
  
  // Default: exclude unless we have positive evidence it's a land crossing
  // This prevents random CBP offices from showing up
  return false;
}

// Determine countries from coordinates using reverse geocoding
async function getCountryFromCoords(lat: number, lng: number): Promise<string | null> {
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_API_KEY}&result_type=country`
    );
    const data = await response.json();
    
    if (data.status === "OK" && data.results.length > 0) {
      const countryComponent = data.results[0].address_components?.find(
        (c: { types: string[] }) => c.types.includes("country")
      );
      return countryComponent?.short_name || null;
    }
    return null;
  } catch (err) {
    console.error("Reverse geocoding error:", err);
    return null;
  }
}

// Fetch place details to get additional info like photos and phone
async function fetchPlaceDetails(placeId: string): Promise<GooglePlaceResult | null> {
  try {
    const fields = "place_id,name,geometry,formatted_address,rating,user_ratings_total,opening_hours,formatted_phone_number,website,photos,types";
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${GOOGLE_API_KEY}`
    );
    const data: PlaceDetailsResponse = await response.json();
    
    if (data.status === "OK") {
      return data.result;
    }
    return null;
  } catch (err) {
    console.error("Place details error:", err);
    return null;
  }
}

export async function GET(request: NextRequest) {
  // Auth check
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!GOOGLE_API_KEY) {
    return NextResponse.json({ error: "Google API key not configured" }, { status: 500 });
  }

  // Parse query params
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get("lat") || "");
  const lng = parseFloat(searchParams.get("lng") || "");
  const radiusKm = parseInt(searchParams.get("radius") || "50", 10);

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: "Invalid lat/lng parameters" }, { status: 400 });
  }

  const radiusMeters = radiusKm * 1000;

  try {
    // Step 1: Search Google Places for border crossings nearby
    const searchResponse = await fetch(
      `https://maps.googleapis.com/maps/api/place/textsearch/json?query=border+crossing+customs&location=${lat},${lng}&radius=${radiusMeters}&key=${GOOGLE_API_KEY}`
    );
    const searchData: NearbySearchResponse = await searchResponse.json();

    if (searchData.status !== "OK" && searchData.status !== "ZERO_RESULTS") {
      console.error("Google Places search error:", searchData.status);
      return NextResponse.json({ error: "Failed to search Google Places" }, { status: 500 });
    }

    const googleResults = searchData.results || [];
    const crossings = [];
    const now = new Date();

    // Step 2: Process each result - check cache or fetch details
    for (const result of googleResults.slice(0, 10)) { // Limit to 10 results
      const placeId = result.place_id;
      
      // IMPORTANT: Validate distance - Google Text Search doesn't strictly enforce radius
      const resultLat = result.geometry?.location?.lat;
      const resultLng = result.geometry?.location?.lng;
      if (resultLat && resultLng) {
        const distanceKm = calculateDistanceKm(lat, lng, resultLat, resultLng);
        if (distanceKm > radiusKm * 1.5) { // Allow 50% buffer for places near edge
          console.log(`Skipping ${result.name} - too far: ${distanceKm.toFixed(1)}km > ${radiusKm}km radius`);
          continue;
        }
      }

      // Check if we have this crossing cached and it's fresh
      const cached = await prisma.borderCrossing.findUnique({
        where: { googlePlaceId: placeId },
      });

      if (cached && (now.getTime() - cached.lastFetched.getTime()) < CACHE_DURATION_MS) {
        // Filter out non-land crossings (airports, etc.)
        const cachedTypes = cached.placeTypes as string[] | null;
        if (!isLikelyLandCrossing(cached.name, cachedTypes, cached.address)) {
          continue;
        }
        
        // Use cached data
        crossings.push({
          id: cached.id,
          googlePlaceId: cached.googlePlaceId,
          name: cached.name,
          lat: cached.lat,
          lng: cached.lng,
          address: cached.address,
          rating: cached.rating,
          userRatingsTotal: cached.userRatingsTotal,
          openingHours: cached.openingHours,
          phoneNumber: cached.phoneNumber,
          websiteUrl: cached.websiteUrl,
          photoUrls: (cached.photoReferences as string[] || []).slice(0, 3).map(ref => getPhotoUrl(ref)),
          fromCountry: cached.fromCountry,
          toCountry: cached.toCountry,
          motorcycleTips: cached.motorcycleTips,
          warnings: cached.warnings,
          bestTimeToGo: cached.bestTimeToGo,
          tipProcessInfo: cached.tipProcessInfo,
          hasAiTips: !!cached.lastAiEnhanced,
        });
        continue;
      }

      // Fetch full place details from Google
      const details = await fetchPlaceDetails(placeId);
      if (!details) continue;
      
      // Filter out non-land crossings (airports, etc.)
      if (!isLikelyLandCrossing(details.name, details.types, details.formatted_address)) {
        continue;
      }

      // Extract photo references
      const photoRefs = details.photos?.map(p => p.photo_reference) || [];

      // Try to determine countries (this is approximate - border crossings span two countries)
      // We'll set the "fromCountry" based on the actual location
      const locationCountry = await getCountryFromCoords(
        details.geometry.location.lat,
        details.geometry.location.lng
      );

      // Upsert to database
      const crossing = await prisma.borderCrossing.upsert({
        where: { googlePlaceId: placeId },
        create: {
          googlePlaceId: placeId,
          name: details.name,
          lat: details.geometry.location.lat,
          lng: details.geometry.location.lng,
          address: details.formatted_address || null,
          rating: details.rating || null,
          userRatingsTotal: details.user_ratings_total || null,
          openingHours: details.opening_hours?.weekday_text ?? Prisma.JsonNull,
          phoneNumber: details.formatted_phone_number || null,
          websiteUrl: details.website || null,
          photoReferences: photoRefs.length > 0 ? photoRefs : Prisma.JsonNull,
          placeTypes: details.types ?? Prisma.JsonNull,
          fromCountry: locationCountry,
          toCountry: null, // Will be enhanced later or by AI
          lastFetched: now,
        },
        update: {
          name: details.name,
          lat: details.geometry.location.lat,
          lng: details.geometry.location.lng,
          address: details.formatted_address || null,
          rating: details.rating || null,
          userRatingsTotal: details.user_ratings_total || null,
          openingHours: details.opening_hours?.weekday_text ?? Prisma.JsonNull,
          phoneNumber: details.formatted_phone_number || null,
          websiteUrl: details.website || null,
          photoReferences: photoRefs.length > 0 ? photoRefs : Prisma.JsonNull,
          placeTypes: details.types ?? Prisma.JsonNull,
          fromCountry: locationCountry,
          lastFetched: now,
        },
      });

      crossings.push({
        id: crossing.id,
        googlePlaceId: crossing.googlePlaceId,
        name: crossing.name,
        lat: crossing.lat,
        lng: crossing.lng,
        address: crossing.address,
        rating: crossing.rating,
        userRatingsTotal: crossing.userRatingsTotal,
        openingHours: crossing.openingHours,
        phoneNumber: crossing.phoneNumber,
        websiteUrl: crossing.websiteUrl,
        photoUrls: photoRefs.slice(0, 3).map(ref => getPhotoUrl(ref)),
        fromCountry: crossing.fromCountry,
        toCountry: crossing.toCountry,
        motorcycleTips: crossing.motorcycleTips,
        warnings: crossing.warnings,
        bestTimeToGo: crossing.bestTimeToGo,
        tipProcessInfo: crossing.tipProcessInfo,
        hasAiTips: !!crossing.lastAiEnhanced,
      });
    }

    return NextResponse.json({
      crossings,
      searchLocation: { lat, lng },
      radiusKm,
    });
  } catch (err) {
    console.error("Error fetching nearby crossings:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
