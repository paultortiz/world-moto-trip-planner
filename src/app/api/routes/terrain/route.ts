import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { openai } from "@/lib/openai";
import { decodePolyline } from "@/features/map/polyline";
import {
  TERRAIN_TYPES,
  type TerrainType,
  type TerrainSegment,
  type TerrainClassificationData,
} from "@/lib/terrainClassification";

const ELEVATION_URL = "https://maps.googleapis.com/maps/api/elevation/json";
const MAX_SAMPLES = 30;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function haversineMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h =
    sinDLat * sinDLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinDLng * sinDLng;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

interface SamplePoint {
  idx: number;
  lat: number;
  lng: number;
  distanceKm: number;
  elevationM: number;
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

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
    if (!openai) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is not configured" },
        { status: 500 },
      );
    }

    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: { routeSegments: true },
    });

    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    const segmentWithPolyline = trip.routeSegments.find(
      (seg) => !!seg.polyline,
    );
    if (!segmentWithPolyline?.polyline) {
      return NextResponse.json(
        { error: "No route polyline. Recalculate the route first." },
        { status: 400 },
      );
    }

    // 1. Decode polyline and sample evenly-spaced points
    const path = decodePolyline(segmentWithPolyline.polyline);
    if (!path || path.length < 2) {
      return NextResponse.json(
        { error: "Decoded route path is too short" },
        { status: 400 },
      );
    }

    // Build cumulative distance array
    const cumDist: number[] = [0];
    for (let i = 1; i < path.length; i++) {
      cumDist.push(cumDist[i - 1] + haversineMeters(path[i - 1], path[i]));
    }
    const totalDistM = cumDist[cumDist.length - 1];

    // Pick evenly-spaced sample indices
    const sampleIndices: number[] = [];
    const step = totalDistM / (MAX_SAMPLES - 1);
    let nextTarget = 0;
    let j = 0;
    for (let s = 0; s < MAX_SAMPLES; s++) {
      while (j < cumDist.length - 1 && cumDist[j + 1] < nextTarget) j++;
      if (!sampleIndices.includes(j)) sampleIndices.push(j);
      nextTarget += step;
    }
    // Ensure last point is included
    if (sampleIndices[sampleIndices.length - 1] !== path.length - 1) {
      sampleIndices.push(path.length - 1);
    }

    const sampleCoords = sampleIndices.map((i) => path[i]);

    // 2. Fetch elevations from Google
    const locationsParam = sampleCoords
      .map((p) => `${p.lat},${p.lng}`)
      .join("|");
    const elevUrl = `${ELEVATION_URL}?locations=${encodeURIComponent(locationsParam)}&key=${apiKey}`;
    const elevRes = await fetch(elevUrl);
    if (!elevRes.ok) {
      console.error("Elevation API error", elevRes.status);
      return NextResponse.json(
        { error: "Failed to fetch elevation data" },
        { status: 502 },
      );
    }
    const elevData = await elevRes.json();
    if (!elevData.results || elevData.results.length === 0) {
      return NextResponse.json(
        { error: "No elevation data returned" },
        { status: 502 },
      );
    }

    const samples: SamplePoint[] = sampleIndices.map((pathIdx, i) => ({
      idx: i,
      lat: sampleCoords[i].lat,
      lng: sampleCoords[i].lng,
      distanceKm: cumDist[pathIdx] / 1000,
      elevationM: elevData.results[i]?.elevation ?? 0,
    }));

    // 3. Ask OpenAI to classify each point's terrain/biome
    const allowedTypes = TERRAIN_TYPES.join(", ");
    const pointsList = samples
      .map(
        (s) =>
          `${s.idx}: lat=${s.lat.toFixed(4)}, lng=${s.lng.toFixed(4)}, elev=${Math.round(s.elevationM)}m, dist=${s.distanceKm.toFixed(1)}km`,
      )
      .join("\n");

    const aiRes = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: `You are a geography and terrain classification expert. Given a set of points along a motorcycle route (latitude, longitude, elevation), classify the terrain/biome type for each point. Use ONLY these types: ${allowedTypes}. Return valid JSON only, no markdown.`,
        },
        {
          role: "user",
          content: `Classify each point's terrain type and provide a short human-readable label (e.g. "Coastal Highway", "Alpine Pass", "Sonoran Desert").

Points:
${pointsList}

Return JSON: { "points": [ { "idx": 0, "type": "coastal", "label": "Coastal Highway" }, ... ] }
Only use these types: ${allowedTypes}`,
        },
      ],
    });

    const aiText = aiRes.choices[0]?.message?.content?.trim() ?? "";

    // Parse AI response
    let classified: { idx: number; type: string; label: string }[] = [];
    try {
      let jsonStr = aiText;
      const fenceMatch = aiText.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (fenceMatch) jsonStr = fenceMatch[1].trim();
      // Remove trailing commas
      jsonStr = jsonStr.replace(/,\s*([\]}])/g, "$1");
      const parsed = JSON.parse(jsonStr);
      classified = parsed.points ?? parsed;
    } catch {
      console.error("Failed to parse terrain AI response:", aiText);
      return NextResponse.json(
        { error: "Failed to parse AI terrain classification" },
        { status: 502 },
      );
    }

    // 4. Merge consecutive same-type points into segments
    const validTypes = new Set<string>(TERRAIN_TYPES);
    const segments: TerrainSegment[] = [];
    let segStart: SamplePoint | null = null;
    let segType: TerrainType | null = null;
    let segLabel = "";
    let segElevations: number[] = [];

    for (let i = 0; i < samples.length; i++) {
      const point = samples[i];
      const match = classified.find((c) => c.idx === i);
      const type = (
        match && validTypes.has(match.type) ? match.type : "plains"
      ) as TerrainType;
      const label = match?.label ?? type;

      if (type === segType && segStart) {
        // Extend current segment
        segElevations.push(point.elevationM);
      } else {
        // Close previous segment
        if (segStart && segType) {
          segments.push({
            startKm: segStart.distanceKm,
            endKm: point.distanceKm,
            type: segType,
            label: segLabel,
            avgElevationM: Math.round(
              segElevations.reduce((a, b) => a + b, 0) / segElevations.length,
            ),
            maxElevationM: Math.round(Math.max(...segElevations)),
          });
        }
        // Start new segment
        segStart = point;
        segType = type;
        segLabel = label;
        segElevations = [point.elevationM];
      }
    }

    // Close final segment
    if (segStart && segType) {
      const lastSample = samples[samples.length - 1];
      segments.push({
        startKm: segStart.distanceKm,
        endKm: lastSample.distanceKm,
        type: segType,
        label: segLabel,
        avgElevationM: Math.round(
          segElevations.reduce((a, b) => a + b, 0) / segElevations.length,
        ),
        maxElevationM: Math.round(Math.max(...segElevations)),
      });
    }

    // 5. Persist
    const classificationData: TerrainClassificationData = {
      segments,
      generatedAt: new Date().toISOString(),
    };

    await prisma.trip.update({
      where: { id: tripId },
      data: {
        terrainClassification:
          classificationData as unknown as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json(classificationData);
  } catch (error) {
    console.error("Terrain classification error:", error);
    return NextResponse.json(
      { error: "Failed to classify terrain" },
      { status: 500 },
    );
  }
}
