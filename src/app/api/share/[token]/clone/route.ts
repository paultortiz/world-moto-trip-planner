import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

interface RouteParams {
  params: { token: string };
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user || !(session.user as any).id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id as string;
  const { token } = params;

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  try {
    const source = await prisma.trip.findFirst({
      where: { shareToken: token, isPublic: true },
      include: {
        waypoints: { orderBy: { orderIndex: "asc" } },
        checklistItems: { orderBy: { orderIndex: "asc" } },
      },
    });

    if (!source) {
      return NextResponse.json({ error: "Shared trip not found" }, { status: 404 });
    }

    const cloned = await prisma.trip.create({
      data: {
        userId,
        name: `${source.name} (clone)`,
        description: source.description,
        startDate: source.startDate,
        endDate: source.endDate,
        fuelRangeKm: source.fuelRangeKm,
        fuelReserveKm: source.fuelReserveKm,
        totalDistanceMeters: null,
        totalDurationSeconds: null,
        totalAscentMeters: null,
        totalDescentMeters: null,
        maxElevationMeters: null,
        plannedDailyRideHours: source.plannedDailyRideHours,
        earliestDepartureHour: source.earliestDepartureHour,
        latestArrivalHour: source.latestArrivalHour,
        segmentNotes: source.segmentNotes,
        checklistItems:
          source.checklistItems.length > 0
            ? {
                create: source.checklistItems.map((item) => ({
                  orderIndex: item.orderIndex,
                  label: item.label,
                  isDone: item.isDone,
                })),
              }
            : undefined,
        waypoints:
          source.waypoints.length > 0
            ? {
                create: source.waypoints.map((wp, index) => ({
                  orderIndex: index,
                  lat: wp.lat,
                  lng: wp.lng,
                  name: wp.name,
                  notes: wp.notes,
                  type: wp.type,
                  dayIndex: wp.dayIndex,
                })),
              }
            : undefined,
      },
    });

    // Fire-and-forget route calculation for the cloned trip.
    try {
      await fetch(`${req.nextUrl.origin}/api/routes/calculate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tripId: cloned.id }),
      });
    } catch {
      // Ignore failures; user can recalc from the trip page.
    }

    return NextResponse.json({ id: cloned.id }, { status: 201 });
  } catch (error) {
    console.error("Error cloning shared trip", error);
    return NextResponse.json({ error: "Failed to clone trip" }, { status: 500 });
  }
}
