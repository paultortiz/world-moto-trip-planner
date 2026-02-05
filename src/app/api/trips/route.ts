import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id as string;

    const trips = await prisma.trip.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json(trips);
  } catch (error) {
    console.error("Error fetching trips", error);
    return NextResponse.json({ error: "Failed to fetch trips" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
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
      motorcycleId,
      fuelAutoFromMotorcycle,
    } = body ?? {};

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 },
      );
    }

    const session = await auth();
    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const userId = (session.user as any).id as string;

    const safeWaypoints = Array.isArray(waypoints)
      ? waypoints.filter(
          (wp) =>
            wp &&
            typeof wp.lat === "number" &&
            typeof wp.lng === "number",
        )
      : [];

    let derivedRange: number | undefined;
    let derivedReserve: number | undefined;

    if (typeof motorcycleId === "string" && motorcycleId.trim() !== "") {
      const moto = await prisma.motorcycle.findFirst({
        where: { id: motorcycleId, userId },
      });
      if (moto) {
        const baseRange =
          typeof moto.preferredRangeKm === "number" && Number.isFinite(moto.preferredRangeKm)
            ? moto.preferredRangeKm
            : typeof moto.estimatedRangeKm === "number" && Number.isFinite(moto.estimatedRangeKm)
            ? moto.estimatedRangeKm
            : undefined;
        if (baseRange != null) {
          derivedRange = Math.round(baseRange);
          const baseReserve =
            typeof moto.preferredReserveKm === "number" && Number.isFinite(moto.preferredReserveKm)
              ? moto.preferredReserveKm
              : Math.round(baseRange * 0.8);
          derivedReserve = Math.round(baseReserve);
        }
      }
    }

    const trip = await prisma.trip.create({
      data: {
        userId,
        name,
        description,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        fuelRangeKm:
          typeof fuelRangeKm === "number" && Number.isFinite(fuelRangeKm)
            ? Math.round(fuelRangeKm)
            : derivedRange,
        fuelReserveKm:
          typeof fuelReserveKm === "number" && Number.isFinite(fuelReserveKm)
            ? Math.round(fuelReserveKm)
            : derivedReserve,
        fuelAutoFromMotorcycle:
          typeof fuelAutoFromMotorcycle === "boolean"
            ? fuelAutoFromMotorcycle
            : typeof motorcycleId === "string" && motorcycleId.trim() !== ""
            ? true
            : undefined,
        motorcycleId:
          typeof motorcycleId === "string" && motorcycleId.trim() !== ""
            ? motorcycleId
            : undefined,
        waypoints:
          safeWaypoints.length > 0
            ? {
                create: safeWaypoints.map((wp, index) => ({
                  orderIndex: index,
                  lat: wp.lat,
                  lng: wp.lng,
                  type: "CHECKPOINT",
                })),
              }
            : undefined,
      },
      include: {
        waypoints: true,
      },
    });

    return NextResponse.json(trip, { status: 201 });
  } catch (error) {
    console.error("Error creating trip", error);
    return NextResponse.json({ error: "Failed to create trip" }, { status: 500 });
  }
}
