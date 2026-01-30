import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

interface RouteParams {
  params: { id: string };
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user || !(session.user as any).id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id as string;
  const { id } = params;

  try {
    const trip = await prisma.trip.findFirst({
      where: { id, userId },
      include: {
        waypoints: { orderBy: { orderIndex: "asc" } },
        routeSegments: true,
        checklistItems: { orderBy: { orderIndex: "asc" } },
      },
    });

    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    return NextResponse.json(trip);
  } catch (error) {
    console.error("Error fetching trip", error);
    return NextResponse.json({ error: "Failed to fetch trip" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user || !(session.user as any).id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id as string;
  const { id } = params;

  try {
    const body = await req.json();
    const {
      name,
      description,
      startDate,
      endDate,
      waypoints,
      fuelRangeKm,
      fuelReserveKm,
      plannedDailyRideHours,
      earliestDepartureHour,
      latestArrivalHour,
      segmentNotes,
    } = body ?? {};

    const safeWaypoints = Array.isArray(waypoints)
      ? waypoints.filter(
          (wp) =>
            wp &&
            typeof wp.lat === "number" &&
            typeof wp.lng === "number",
        )
      : null;

    const updatedTrip = await prisma.$transaction(async (tx) => {
      // Update basic trip fields if provided.
      await tx.trip.update({
        where: { id, userId },
        data: {
          name,
          description,
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined,
          fuelRangeKm:
            typeof fuelRangeKm === "number" && Number.isFinite(fuelRangeKm)
              ? Math.round(fuelRangeKm)
              : undefined,
          fuelReserveKm:
            typeof fuelReserveKm === "number" && Number.isFinite(fuelReserveKm)
              ? Math.round(fuelReserveKm)
              : undefined,
          plannedDailyRideHours:
            typeof plannedDailyRideHours === "number" && Number.isFinite(plannedDailyRideHours)
              ? Math.round(plannedDailyRideHours)
              : undefined,
          earliestDepartureHour:
            typeof earliestDepartureHour === "number" && Number.isFinite(earliestDepartureHour)
              ? Math.round(earliestDepartureHour)
              : undefined,
          latestArrivalHour:
            typeof latestArrivalHour === "number" && Number.isFinite(latestArrivalHour)
              ? Math.round(latestArrivalHour)
              : undefined,
          segmentNotes: segmentNotes ?? undefined,
        },
      });

      if (safeWaypoints) {
        // Replace waypoints and clear route segments when waypoints change.
        await tx.routeSegment.deleteMany({ where: { tripId: id } });
        await tx.waypoint.deleteMany({ where: { tripId: id } });

        for (let index = 0; index < safeWaypoints.length; index++) {
          const wp = safeWaypoints[index];
          await tx.waypoint.create({
            // Cast data as any so we can include the optional googlePlaceId field
            // without depending on generated Prisma client types being rebuilt
            // before the Next.js type-checking step.
            data: {
              tripId: id,
              orderIndex: index,
              lat: wp.lat,
              lng: wp.lng,
              name: wp.name ?? null,
              notes: wp.notes ?? null,
              type: wp.type ?? "CHECKPOINT",
              googlePlaceId: (wp as any).googlePlaceId ?? null,
              dayIndex:
                typeof wp.dayIndex === "number" && Number.isInteger(wp.dayIndex)
                  ? wp.dayIndex
                  : null,
            } as any,
          });
        }
      }

      return tx.trip.findFirst({
        where: { id, userId },
        include: {
          waypoints: { orderBy: { orderIndex: "asc" } },
          routeSegments: true,
          checklistItems: { orderBy: { orderIndex: "asc" } },
        },
      });
    });

    return NextResponse.json(updatedTrip);
  } catch (error) {
    console.error("Error updating trip", error);
    return NextResponse.json({ error: "Failed to update trip" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user || !(session.user as any).id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id as string;
  const { id } = params;

  try {
    // Ensure the trip belongs to the authenticated user.
    const trip = await prisma.trip.findFirst({ where: { id, userId } });
    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    // Clean up related data explicitly to avoid orphaned rows.
    await prisma.routeSegment.deleteMany({ where: { tripId: id } });
    await prisma.waypoint.deleteMany({ where: { tripId: id } });
    await prisma.trip.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error deleting trip", error);
    return NextResponse.json({ error: "Failed to delete trip" }, { status: 500 });
  }
}
