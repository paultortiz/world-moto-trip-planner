import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DIRECTIONS_URL = "https://maps.googleapis.com/maps/api/directions/json";

// Google Maps Directions API allows max 25 waypoints (excluding origin/destination)
const MAX_WAYPOINTS_PER_REQUEST = 25;

interface WaypointCoord {
  lat: number;
  lng: number;
}

interface ChunkResult {
  distanceMeters: number;
  durationSeconds: number;
  polyline: string;
}

/**
 * Fetch directions for a single chunk of waypoints.
 * Returns distance, duration, and encoded polyline.
 */
async function fetchDirectionsChunk(
  origin: string,
  destination: string,
  viaPoints: WaypointCoord[],
  apiKey: string,
): Promise<ChunkResult> {
  const waypointsParam =
    viaPoints.length > 0
      ? `&waypoints=${encodeURIComponent(
          viaPoints.map((wp) => `${wp.lat},${wp.lng}`).join("|"),
        )}`
      : "";

  const url = `${DIRECTIONS_URL}?origin=${encodeURIComponent(
    origin,
  )}&destination=${encodeURIComponent(destination)}${waypointsParam}&key=${apiKey}`;

  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Directions API HTTP error ${res.status}: ${text}`);
  }

  const data = await res.json();

  if (!data.routes || data.routes.length === 0 || data.status !== "OK") {
    throw new Error(
      data.error_message ||
        (data.status && typeof data.status === "string"
          ? `Directions API returned status ${data.status}`
          : "No route found from Directions API"),
    );
  }

  const route = data.routes[0];
  const legs = route.legs ?? [];

  let distanceMeters = 0;
  let durationSeconds = 0;

  // Collect step-level polylines for a smooth, road-following line
  const stepPolylines: string[] = [];

  for (const leg of legs) {
    if (leg.distance?.value) distanceMeters += leg.distance.value;
    if (leg.duration?.value) durationSeconds += leg.duration.value;
    
    // Extract polyline from each step for detailed road geometry
    const steps = leg.steps ?? [];
    for (const step of steps) {
      if (step.polyline?.points) {
        stepPolylines.push(step.polyline.points);
      }
    }
  }

  // Combine step polylines for smooth road-following line,
  // fall back to overview_polyline if no steps available
  const detailedPolyline = stepPolylines.length > 0
    ? combinePolylines(stepPolylines)
    : (route.overview_polyline?.points ?? "");

  return {
    distanceMeters,
    durationSeconds,
    polyline: detailedPolyline,
  };
}

/**
 * Combine multiple encoded polylines into one.
 * Uses a simple concatenation approach - decodes each, combines points, re-encodes.
 */
function combinePolylines(polylines: string[]): string {
  if (polylines.length === 0) return "";
  if (polylines.length === 1) return polylines[0];

  // Decode all polylines to points
  const allPoints: Array<[number, number]> = [];
  for (const encoded of polylines) {
    const points = decodePolyline(encoded);
    // Skip first point of subsequent polylines to avoid duplicates at boundaries
    if (allPoints.length > 0 && points.length > 0) {
      allPoints.push(...points.slice(1));
    } else {
      allPoints.push(...points);
    }
  }

  // Re-encode combined points
  return encodePolyline(allPoints);
}

/**
 * Decode an encoded polyline string into an array of [lat, lng] pairs.
 */
function decodePolyline(encoded: string): Array<[number, number]> {
  const points: Array<[number, number]> = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push([lat / 1e5, lng / 1e5]);
  }

  return points;
}

/**
 * Encode an array of [lat, lng] pairs into a polyline string.
 */
function encodePolyline(points: Array<[number, number]>): string {
  let encoded = "";
  let prevLat = 0;
  let prevLng = 0;

  for (const [lat, lng] of points) {
    const latInt = Math.round(lat * 1e5);
    const lngInt = Math.round(lng * 1e5);

    encoded += encodeSignedNumber(latInt - prevLat);
    encoded += encodeSignedNumber(lngInt - prevLng);

    prevLat = latInt;
    prevLng = lngInt;
  }

  return encoded;
}

function encodeSignedNumber(num: number): string {
  let sgn = num < 0 ? ~(num << 1) : num << 1;
  let encoded = "";

  while (sgn >= 0x20) {
    encoded += String.fromCharCode((0x20 | (sgn & 0x1f)) + 63);
    sgn >>= 5;
  }

  encoded += String.fromCharCode(sgn + 63);
  return encoded;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tripId } = body ?? {};

    if (!tripId || typeof tripId !== "string") {
      return NextResponse.json(
        { error: "tripId is required" },
        { status: 400 },
      );
    }

    const apiKey = process.env.GOOGLE_MAPS_SERVER_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GOOGLE_MAPS_SERVER_KEY is not configured" },
        { status: 500 },
      );
    }

    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: { waypoints: { orderBy: { orderIndex: "asc" } } },
    });

    if (!trip) {
      return NextResponse.json(
        { error: "Trip not found" },
        { status: 404 },
      );
    }

    if (trip.waypoints.length < 2) {
      return NextResponse.json(
        { error: "At least two waypoints are required to calculate a route" },
        { status: 400 },
      );
    }

    const allWaypoints = trip.waypoints.map((wp) => ({ lat: wp.lat, lng: wp.lng }));
    
    let totalDistanceMeters = 0;
    let totalDurationSeconds = 0;
    const polylines: string[] = [];

    // Check if we need to chunk the request
    // Total waypoints = origin + via points + destination
    // Via points = total - 2 (origin and destination)
    const viaCount = allWaypoints.length - 2;

    if (viaCount <= MAX_WAYPOINTS_PER_REQUEST) {
      // Single request - no chunking needed
      const origin = `${allWaypoints[0].lat},${allWaypoints[0].lng}`;
      const destination = `${allWaypoints[allWaypoints.length - 1].lat},${allWaypoints[allWaypoints.length - 1].lng}`;
      const via = allWaypoints.slice(1, -1);

      const result = await fetchDirectionsChunk(origin, destination, via, apiKey);
      totalDistanceMeters = result.distanceMeters;
      totalDurationSeconds = result.durationSeconds;
      polylines.push(result.polyline);
    } else {
      // Need to chunk - split waypoints into groups
      // Each chunk: origin + up to 25 via points + destination
      // Chunks overlap: end of chunk N = start of chunk N+1
      
      let chunkStartIdx = 0;
      
      while (chunkStartIdx < allWaypoints.length - 1) {
        // Calculate how many points we can include in this chunk
        // We need origin (1) + via points (up to 25) + destination (1) = max 27 points per chunk
        // But the destination of this chunk becomes the origin of the next, so:
        // chunkStartIdx is origin, we take up to 25 via points, then 1 destination
        const chunkEndIdx = Math.min(
          chunkStartIdx + MAX_WAYPOINTS_PER_REQUEST + 1, // +1 for destination
          allWaypoints.length - 1,
        );

        const chunkOrigin = allWaypoints[chunkStartIdx];
        const chunkDestination = allWaypoints[chunkEndIdx];
        const chunkVia = allWaypoints.slice(chunkStartIdx + 1, chunkEndIdx);

        const origin = `${chunkOrigin.lat},${chunkOrigin.lng}`;
        const destination = `${chunkDestination.lat},${chunkDestination.lng}`;

        const result = await fetchDirectionsChunk(origin, destination, chunkVia, apiKey);
        totalDistanceMeters += result.distanceMeters;
        totalDurationSeconds += result.durationSeconds;
        if (result.polyline) {
          polylines.push(result.polyline);
        }

        // Move to next chunk - start from current destination
        chunkStartIdx = chunkEndIdx;
      }
    }

    // Combine polylines if we had multiple chunks
    const overviewPolyline = combinePolylines(polylines);

    // Clear previous route segments for this trip.
    await prisma.routeSegment.deleteMany({ where: { tripId } });

    if (overviewPolyline) {
      await prisma.routeSegment.create({
        data: {
          tripId,
          startWaypointId: trip.waypoints[0].id,
          endWaypointId: trip.waypoints[trip.waypoints.length - 1].id,
          distanceMeters: totalDistanceMeters,
          durationSeconds: totalDurationSeconds,
          polyline: overviewPolyline,
        },
      });
    }

    const updatedTrip = await prisma.trip.update({
      where: { id: tripId },
      data: {
        totalDistanceMeters,
        totalDurationSeconds,
      },
      include: {
        waypoints: { orderBy: { orderIndex: "asc" } },
        routeSegments: true,
      },
    });

    return NextResponse.json(updatedTrip);
  } catch (error) {
    console.error("Error calculating route", error);
    return NextResponse.json(
      { error: "Failed to calculate route" },
      { status: 500 },
    );
  }
}
