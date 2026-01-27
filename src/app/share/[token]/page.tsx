import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { decodePolyline } from "@/features/map/polyline";
import SharedTripClient from "./SharedTripClient";
import type { WaypointPosition } from "@/features/map/TripPlannerMap";

interface SharedTripPageProps {
  params: { token: string };
}

export default async function SharedTripPage({ params }: SharedTripPageProps) {
  const { token } = params;

  if (!token) {
    notFound();
  }

  const trip = await prisma.trip.findFirst({
    where: { shareToken: token, isPublic: true },
    include: {
      waypoints: { orderBy: { orderIndex: "asc" } },
      routeSegments: true,
    },
  });

  if (!trip) {
    notFound();
  }

  const waypoints: WaypointPosition[] = trip.waypoints.map((wp) => ({
    lat: wp.lat,
    lng: wp.lng,
    type: wp.type,
  }));

  const firstSegmentWithPolyline = trip.routeSegments.find((seg) => !!seg.polyline);

  const routePath: WaypointPosition[] | undefined =
    firstSegmentWithPolyline?.polyline
      ? decodePolyline(firstSegmentWithPolyline.polyline)
      : undefined;

  return (
    <SharedTripClient
      tripId={trip.id}
      token={token}
      name={trip.name}
      description={trip.description}
      totalDistanceMeters={trip.totalDistanceMeters}
      totalDurationSeconds={trip.totalDurationSeconds}
      waypoints={waypoints}
      routePath={routePath}
    />
  );
}
