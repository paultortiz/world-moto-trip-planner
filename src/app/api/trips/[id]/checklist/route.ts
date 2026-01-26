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
        checklistItems: { orderBy: { orderIndex: "asc" } },
      },
    });

    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    return NextResponse.json(trip.checklistItems);
  } catch (error) {
    console.error("Error fetching checklist", error);
    return NextResponse.json({ error: "Failed to fetch checklist" }, { status: 500 });
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
    const { items } = body ?? {};

    const safeItems = Array.isArray(items)
      ? items
          .map((item: any) => ({
            label: typeof item.label === "string" ? item.label.trim() : "",
            isDone: Boolean(item.isDone),
          }))
          .filter((item: any) => item.label.length > 0)
      : [];

    const updatedItems = await prisma.$transaction(async (tx) => {
      // Ensure trip belongs to user
      const trip = await tx.trip.findFirst({ where: { id, userId } });
      if (!trip) {
        throw new Error("Trip not found");
      }

      // Replace checklist items for this trip in order
      await tx.tripChecklistItem.deleteMany({ where: { tripId: id } });

      for (let index = 0; index < safeItems.length; index++) {
        const item = safeItems[index];
        await tx.tripChecklistItem.create({
          data: {
            tripId: id,
            orderIndex: index,
            label: item.label,
            isDone: item.isDone,
          },
        });
      }

      return tx.tripChecklistItem.findMany({
        where: { tripId: id },
        orderBy: { orderIndex: "asc" },
      });
    });

    return NextResponse.json(updatedItems);
  } catch (error: any) {
    console.error("Error updating checklist", error);
    if (error?.message === "Trip not found") {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to update checklist" }, { status: 500 });
  }
}
