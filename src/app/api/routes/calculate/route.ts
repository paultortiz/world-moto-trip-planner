import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DIRECTIONS_URL = "https://maps.googleapis.com/maps/api/directions/json";

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

    const origin = `${trip.waypoints[0].lat},${trip.waypoints[0].lng}`;
    const destination = `${trip.waypoints[trip.waypoints.length - 1].lat},${
      trip.waypoints[trip.waypoints.length - 1].lng
    }`;

    const via = trip.waypoints.slice(1, -1);
    const waypointsParam =
      via.length > 0
        ? `&waypoints=${encodeURIComponent(
            via.map((wp) => `${wp.lat},${wp.lng}`).join("|"),
          )}`
        : "";

    const url = `${DIRECTIONS_URL}?origin=${encodeURIComponent(
      origin,
    )}&destination=${encodeURIComponent(destination)}${waypointsParam}&key=${apiKey}`;

    const res = await fetch(url);
    if (!res.ok) {
      const text = await res.text();
      console.error("Directions API error", res.status, text);
      return NextResponse.json(
        { error: "Failed to fetch directions" },
        { status: 502 },
      );
    }

    const data = await res.json();

    if (!data.routes || data.routes.length === 0) {
      return NextResponse.json(
        { error: "No route found from Directions API" },
        { status: 502 },
      );
    }

    const route = data.routes[0];
    const legs = route.legs ?? [];

    let totalDistanceMeters = 0;
    let totalDurationSeconds = 0;

    for (const leg of legs) {
      if (leg.distance?.value) totalDistanceMeters += leg.distance.value;
      if (leg.duration?.value) totalDurationSeconds += leg.duration.value;
    }

    const overviewPolyline: string | undefined = route.overview_polyline?.points;

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
