import { NextRequest, NextResponse } from "next/server";
import { parseCBPResponse, type BorderPort } from "@/lib/borderCrossings";
import { getWaitTimeSource } from "@/lib/borderWaitSources";
import { fetchCBSAWaitTimes, findClosestCBSAPort } from "@/lib/cbsaWaitTimes";

// In-memory cache for CBP data
let cachedCBPData: BorderPort[] | null = null;
let cbpCacheTimestamp: number = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const CBP_API_URL = "https://bwt.cbp.gov/api/waittimes";

// Max distance for matching a waypoint to a known port
const MAX_MATCH_DISTANCE_KM = 75;

/**
 * Fetch CBP data with caching.
 */
async function getCBPData(): Promise<{ data: BorderPort[]; cacheAge: number; fresh: boolean }> {
  const now = Date.now();
  if (!cachedCBPData || now - cbpCacheTimestamp > CACHE_TTL_MS) {
    const response = await fetch(CBP_API_URL, {
      headers: {
        Accept: "application/json",
        "User-Agent": "WorldMotoTripPlanner/1.0",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`CBP API error: ${response.status} ${response.statusText}`);
    }

    const rawData = await response.json();

    // CBP API returns varying structures — extract the array
    let portsArray: any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
    if (Array.isArray(rawData)) {
      portsArray = rawData;
    } else if (rawData.ports) {
      portsArray = rawData.ports;
    } else if (rawData.wait_times) {
      portsArray = rawData.wait_times;
    } else {
      const arrayProp = Object.values(rawData).find(Array.isArray);
      portsArray = arrayProp ? (arrayProp as any[]) : []; // eslint-disable-line @typescript-eslint/no-explicit-any
    }

    cachedCBPData = parseCBPResponse(portsArray);
    cbpCacheTimestamp = now;
    return { data: cachedCBPData, cacheAge: 0, fresh: true };
  }

  return {
    data: cachedCBPData,
    cacheAge: Math.round((now - cbpCacheTimestamp) / 1000),
    fresh: false,
  };
}

/**
 * Handle a CBP lookup for a specific lat/lng.
 */
async function handleCBPLookup(latNum: number, lngNum: number, borderFilter?: string | null) {
  const { data, cacheAge, fresh } = await getCBPData();
  let ports = data;

  if (borderFilter && (borderFilter === "canada" || borderFilter === "mexico")) {
    ports = ports.filter((port) => port.border === borderFilter);
  }

  const { findClosestPort, CBP_PORT_COORDINATES } = await import("@/lib/borderCrossings");

  const portsWithCoords = ports.map((port) => ({
    ...port,
    ...CBP_PORT_COORDINATES[port.portNumber],
  }));

  const closest = findClosestPort(latNum, lngNum, portsWithCoords, MAX_MATCH_DISTANCE_KM);

  if (closest) {
    return NextResponse.json({
      source: "cbp",
      port: closest.port,
      distanceKm: closest.distanceKm,
      cached: !fresh,
      cacheAge,
    });
  }

  return NextResponse.json({
    source: "cbp",
    port: null,
    message: `No CBP port found within ${MAX_MATCH_DISTANCE_KM}km of coordinates`,
    cached: true,
    cacheAge,
  });
}

/**
 * Handle a CBSA lookup for a specific lat/lng.
 */
async function handleCBSALookup(latNum: number, lngNum: number) {
  const ports = await fetchCBSAWaitTimes();
  const closest = findClosestCBSAPort(latNum, lngNum, ports, MAX_MATCH_DISTANCE_KM);

  if (closest) {
    return NextResponse.json({
      source: "cbsa",
      port: {
        portName: closest.port.officeName,
        crossingName: closest.port.location,
        border: "canada",
        hours: "",
        lastUpdated: closest.port.lastUpdated,
        passengerWaitMinutes: closest.port.travellersWaitMinutes,
        passengerLanesOpen: 0, // CBSA CSV doesn't provide lane counts
        pedestrianWaitMinutes: null,
        pedestrianLanesOpen: 0,
      },
      distanceKm: closest.distanceKm,
      cached: true,
      cacheAge: 0,
    });
  }

  return NextResponse.json({
    source: "cbsa",
    port: null,
    message: `No CBSA port found within ${MAX_MATCH_DISTANCE_KM}km of coordinates`,
    cached: true,
    cacheAge: 0,
  });
}

/**
 * GET /api/border/wait-times
 *
 * Direction-aware border wait times API. Dispatches to the appropriate data
 * source (CBP, CBSA, or unavailable) based on the travel direction.
 *
 * Query params:
 *   - lat, lng: Coordinates of the border crossing.
 *   - from: ISO country code the rider is departing (e.g., "US").
 *   - to: ISO country code the rider is entering (e.g., "CA").
 *   - border: Optional. Legacy filter by "canada" or "mexico" (CBP-only).
 *
 * When from/to are provided the API uses the data source registry to decide
 * whether to query CBP, CBSA, or return "unavailable".
 * When from/to are omitted, falls back to CBP-only for backwards compatibility.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const borderFilter = searchParams.get("border");

    // --- Direction-aware path (new) ---
    if (from && to) {
      const source = getWaitTimeSource(from, to);

      // If no coordinates, just return the source metadata
      if (!lat || !lng) {
        return NextResponse.json({
          source: source.type,
          sourceLabel: source.sourceLabel,
          directionLabel: source.directionLabel,
          isLive: source.isLive,
          port: null,
        });
      }

      const latNum = parseFloat(lat);
      const lngNum = parseFloat(lng);
      if (isNaN(latNum) || isNaN(lngNum)) {
        return NextResponse.json({ error: "Invalid lat/lng" }, { status: 400 });
      }

      switch (source.type) {
        case "cbp":
          return handleCBPLookup(latNum, lngNum, borderFilter);

        case "cbsa":
          return handleCBSALookup(latNum, lngNum);

        default:
          // No live source available for this direction
          return NextResponse.json({
            source: source.type,
            sourceLabel: source.sourceLabel,
            directionLabel: source.directionLabel,
            isLive: false,
            port: null,
            message: `No real-time wait data available for ${source.directionLabel}`,
          });
      }
    }

    // --- Legacy path (no direction) — CBP only for backwards compatibility ---
    if (lat && lng) {
      const latNum = parseFloat(lat);
      const lngNum = parseFloat(lng);
      if (!isNaN(latNum) && !isNaN(lngNum)) {
        return handleCBPLookup(latNum, lngNum, borderFilter);
      }
    }

    // Return all CBP ports (no coordinates)
    const { data, cacheAge, fresh } = await getCBPData();
    let result = data;
    if (borderFilter && (borderFilter === "canada" || borderFilter === "mexico")) {
      result = result.filter((port) => port.border === borderFilter);
    }

    return NextResponse.json({
      source: "cbp",
      ports: result,
      count: result.length,
      cached: !fresh,
      cacheAge,
    });
  } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    console.error("Border wait times API error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Failed to fetch border wait times" },
      { status: 500 }
    );
  }
}
