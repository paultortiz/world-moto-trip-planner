import { NextRequest, NextResponse } from "next/server";
import { parseCBPResponse, type BorderPort } from "@/lib/borderCrossings";

// In-memory cache for CBP data
let cachedData: BorderPort[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const CBP_API_URL = "https://bwt.cbp.gov/api/waittimes";

/**
 * GET /api/border/wait-times
 * 
 * Proxies the CBP Border Wait Times API and caches results for 5 minutes.
 * Returns normalized BorderPort data for all US land border crossings.
 * 
 * Query params:
 *   - lat, lng: Optional. If provided, returns only the closest port within 50km.
 *   - border: Optional. Filter by "canada" or "mexico".
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");
    const borderFilter = searchParams.get("border");

    // Check cache
    const now = Date.now();
    if (!cachedData || now - cacheTimestamp > CACHE_TTL_MS) {
      // Fetch fresh data from CBP
      const response = await fetch(CBP_API_URL, {
        headers: {
          Accept: "application/json",
          "User-Agent": "WorldMotoTripPlanner/1.0",
        },
        // Don't cache at fetch level since we handle it ourselves
        cache: "no-store",
      });

      if (!response.ok) {
        console.error("CBP API error:", response.status, response.statusText);
        return NextResponse.json(
          { error: "Failed to fetch border wait times from CBP" },
          { status: 502 }
        );
      }

      const rawData = await response.json();
      
      // CBP API returns an object with port data - extract the array
      // The API structure varies, handle both array and object formats
      let portsArray: any[];
      if (Array.isArray(rawData)) {
        portsArray = rawData;
      } else if (rawData.ports) {
        portsArray = rawData.ports;
      } else if (rawData.wait_times) {
        portsArray = rawData.wait_times;
      } else {
        // Try to find an array property
        const arrayProp = Object.values(rawData).find(Array.isArray);
        portsArray = arrayProp ? (arrayProp as any[]) : [];
      }

      cachedData = parseCBPResponse(portsArray);
      cacheTimestamp = now;
    }

    let result = cachedData;

    // Filter by border if specified
    if (borderFilter && (borderFilter === "canada" || borderFilter === "mexico")) {
      result = result.filter((port) => port.border === borderFilter);
    }

    // If coordinates provided, find closest port
    if (lat && lng) {
      const latNum = parseFloat(lat);
      const lngNum = parseFloat(lng);

      if (!isNaN(latNum) && !isNaN(lngNum)) {
        // Import the helper dynamically to avoid circular deps
        const { findClosestPort, CBP_PORT_COORDINATES } = await import("@/lib/borderCrossings");
        
        // Add coordinates to ports for distance calculation
        const portsWithCoords = result.map((port) => ({
          ...port,
          ...CBP_PORT_COORDINATES[port.portNumber],
        }));

        const closest = findClosestPort(latNum, lngNum, portsWithCoords, 50);
        
        if (closest) {
          return NextResponse.json({
            port: closest.port,
            distanceKm: closest.distanceKm,
            cached: now - cacheTimestamp < 1000 ? false : true,
            cacheAge: Math.round((now - cacheTimestamp) / 1000),
          });
        } else {
          return NextResponse.json({
            port: null,
            message: "No CBP port found within 50km of coordinates",
            cached: true,
            cacheAge: Math.round((now - cacheTimestamp) / 1000),
          });
        }
      }
    }

    // Return all ports
    return NextResponse.json({
      ports: result,
      count: result.length,
      cached: now - cacheTimestamp < 1000 ? false : true,
      cacheAge: Math.round((now - cacheTimestamp) / 1000),
    });
  } catch (err: any) {
    console.error("Border wait times API error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Failed to fetch border wait times" },
      { status: 500 }
    );
  }
}
