import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { randomUUID } from "crypto";

interface RouteParams {
  params: { id: string };
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user || !(session.user as any).id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id as string;
  const { id } = params;

  try {
    const body = await req.json().catch(() => ({}));
    const { enabled } = body ?? {};
    const enableSharing = enabled !== false;

    // Ensure trip belongs to user
    const trip = await prisma.trip.findFirst({ where: { id, userId } });
    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    let updated;
    if (!enableSharing) {
      updated = await prisma.trip.update({
        where: { id },
        data: { isPublic: false },
      });
    } else {
      const token = trip.shareToken ?? randomUUID().replace(/-/g, "");
      updated = await prisma.trip.update({
        where: { id },
        data: {
          isPublic: true,
          shareToken: token,
        },
      });
    }

    const origin = req.nextUrl.origin;
    const shareToken = updated.shareToken ?? null;
    const shareUrl = updated.isPublic && shareToken ? `${origin}/share/${shareToken}` : null;

    return NextResponse.json({
      isPublic: updated.isPublic,
      shareToken,
      shareUrl,
    });
  } catch (error) {
    console.error("Error updating trip sharing", error);
    return NextResponse.json({ error: "Failed to update trip sharing" }, { status: 500 });
  }
}
