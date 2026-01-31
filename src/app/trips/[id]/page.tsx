import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { decodePolyline } from "@/features/map/polyline";
import type { WaypointPosition } from "@/features/map/TripPlannerMap";
import TripDetailClient from "./TripDetailClient";

interface TripDetailPageProps {
  params: { id: string };
}

export default async function TripDetailPage({
  params,
}: TripDetailPageProps) {
  const session = await auth();
  if (!session?.user || !(session.user as any).id) {
    redirect("/api/auth/signin");
  }

  const userId = (session.user as any).id as string;
  const { id } = params;

  if (!id) {
    notFound();
  }

  const trip = await prisma.trip.findFirst({
    where: { id, userId },
    include: {
      waypoints: { orderBy: { orderIndex: "asc" } },
      routeSegments: true,
    },
  });

  if (!trip) {
    notFound();
  }

  const firstSegmentWithPolyline = trip.routeSegments.find(
    (seg) => !!seg.polyline,
  );

  const routePath: WaypointPosition[] | undefined =
    firstSegmentWithPolyline?.polyline
      ? decodePolyline(firstSegmentWithPolyline.polyline)
      : undefined;

  return (
    <main className="min-h-screen p-6 space-y-6">
      <TripDetailClient trip={trip} routePath={routePath} />
    </main>
  );
}
