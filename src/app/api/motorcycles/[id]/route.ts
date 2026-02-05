import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

interface RouteParams {
  params: { id: string };
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user || !(session.user as any).id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id as string;
  const { id } = params;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { preferredRangeKm, preferredReserveKm, year, make, model, isDefaultForNewTrips } = body ?? {};
  const defaultFlag: boolean | undefined =
    typeof isDefaultForNewTrips === "boolean" ? isDefaultForNewTrips : undefined;

  try {
    const moto = await prisma.motorcycle.findFirst({
      where: { id, userId },
    });

    if (!moto) {
      return NextResponse.json({ error: "Motorcycle not found" }, { status: 404 });
    }

    const data: any = {
      preferredRangeKm:
        typeof preferredRangeKm === "number" && Number.isFinite(preferredRangeKm)
          ? Math.round(preferredRangeKm)
          : null,
      preferredReserveKm:
        typeof preferredReserveKm === "number" && Number.isFinite(preferredReserveKm)
          ? Math.round(preferredReserveKm)
          : null,
    };

    if (typeof year === "number" && Number.isFinite(year)) {
      data.year = year;
    }
    if (typeof make === "string") {
      data.make = make.trim() || null;
    }
    if (typeof model === "string") {
      data.model = model.trim() || null;
    }
    if (defaultFlag !== undefined) {
      data.isDefaultForNewTrips = defaultFlag;
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (defaultFlag === true) {
        // Clear any other defaults for this user so only one bike is default for new trips.
        await tx.motorcycle.updateMany({
          where: {
            userId,
            isDefaultForNewTrips: true,
            id: { not: id },
          },
          data: {
            isDefaultForNewTrips: false,
          },
        });
      }

      return tx.motorcycle.update({
        where: { id },
        data,
      });
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating motorcycle preferences", error);
    return NextResponse.json({ error: "Failed to update motorcycle" }, { status: 500 });
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
    const moto = await prisma.motorcycle.findFirst({
      where: { id, userId },
      include: {
        _count: { select: { trips: true } },
      },
    });

    if (!moto) {
      return NextResponse.json({ error: "Motorcycle not found" }, { status: 404 });
    }

    if (moto._count.trips > 0) {
      return NextResponse.json(
        {
          error:
            "This motorcycle is in use by one or more trips. Detach it from those trips before deleting.",
        },
        { status: 400 },
      );
    }

    await prisma.motorcycle.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error deleting motorcycle", error);
    return NextResponse.json({ error: "Failed to delete motorcycle" }, { status: 500 });
  }
}
