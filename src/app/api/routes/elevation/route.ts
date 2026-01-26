import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decodePolyline } from "@/features/map/polyline";

const ELEVATION_URL = "https://maps.googleapis.com/maps/api/elevation/json";

interface ElevationPoint {
  distanceMeters: number;
  elevationMeters: number;
}

function haversineMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000; // meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h =
    sinDLat * sinDLat +
    Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return R * c;
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
      include: { routeSegments: true },
    });

    if (!trip) {
      return NextResponse.json(
        { error: "Trip not found" },
        { status: 404 },
      );
    }

    const segmentWithPolyline = trip.routeSegments.find((seg) => !!seg.polyline);
    if (!segmentWithPolyline?.polyline) {
      return NextResponse.json(
        { error: "No route polyline found for this trip. Recalculate the route first." },
        { status: 400 },
      );
    }

    const path = decodePolyline(segmentWithPolyline.polyline);
    if (!path || path.length < 2) {
      return NextResponse.json(
        { error: "Decoded route path is too short for elevation profile" },
        { status: 400 },
      );
    }

    // Sample along the polyline to a reasonable number of points for the Elevation API.
    const MAX_SAMPLES = 128;
    const step = Math.max(1, Math.floor(path.length / MAX_SAMPLES));
    const samples = [] as { lat: number; lng: number }[];
    for (let i = 0; i < path.length; i += step) {
      samples.push(path[i]);
    }
    if (samples[samples.length - 1] !== path[path.length - 1]) {
      samples.push(path[path.length - 1]);
    }

    const locationsParam = samples
      .map((p) => `${p.lat},${p.lng}`)
      .join("|");

    const url = `${ELEVATION_URL}?locations=${encodeURIComponent(
      locationsParam,
    )}&key=${apiKey}`;

    const res = await fetch(url);
    if (!res.ok) {
      const text = await res.text();
      console.error("Elevation API error", res.status, text);
      return NextResponse.json(
        { error: "Failed to fetch elevation" },
        { status: 502 },
      );
    }

    const data = await res.json();
    if (!data.results || data.results.length === 0) {
      return NextResponse.json(
        { error: "No elevation data returned" },
        { status: 502 },
      );
    }

    const elevations: ElevationPoint[] = [];
    let distanceFromStart = 0;
    let lastPoint = samples[0];

    for (let i = 0; i < data.results.length; i++) {
      const result = data.results[i];
      const loc = result.location;
      const elev = result.elevation as number;
      const currentPoint = { lat: loc.lat as number, lng: loc.lng as number };

      if (i > 0) {
        distanceFromStart += haversineMeters(lastPoint, currentPoint);
      }
      elevations.push({ distanceMeters: distanceFromStart, elevationMeters: elev });
      lastPoint = currentPoint;
    }

    // Compute ascent, descent, and max elevation.
    let totalAscent = 0;
    let totalDescent = 0;
    let maxElevation = elevations[0]?.elevationMeters ?? 0;

    for (let i = 0; i < elevations.length - 1; i++) {
      const cur = elevations[i].elevationMeters;
      const next = elevations[i + 1].elevationMeters;
      const diff = next - cur;
      if (diff > 0) totalAscent += diff;
      if (diff < 0) totalDescent += -diff;
      if (next > maxElevation) maxElevation = next;
    }

    // Persist summary metrics on the trip.
    await prisma.trip.update({
      where: { id: tripId },
      data: {
        totalAscentMeters: Math.round(totalAscent),
        totalDescentMeters: Math.round(totalDescent),
        maxElevationMeters: Math.round(maxElevation),
      },
    });

    return NextResponse.json({
      elevationProfile: elevations,
      totalAscentMeters: Math.round(totalAscent),
      totalDescentMeters: Math.round(totalDescent),
      maxElevationMeters: Math.round(maxElevation),
    });
  } catch (error) {
    console.error("Error calculating elevation profile", error);
    return NextResponse.json(
      { error: "Failed to calculate elevation profile" },
      { status: 500 },
    );
  }
}
