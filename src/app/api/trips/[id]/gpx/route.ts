import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

interface RouteParams {
  params: { id: string };
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
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
      },
    });

    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    if (!trip.waypoints || trip.waypoints.length < 2) {
      return NextResponse.json(
        { error: "At least two waypoints are required to export GPX" },
        { status: 400 },
      );
    }

    const wps = trip.waypoints;

    // Derive effective day indices similar to the client logic so older trips
    // without explicit days still produce reasonable per-day tracks.
    const effectiveDays: number[] = [];
    let currentDay = 1;
    for (let i = 0; i < wps.length; i++) {
      const raw = (wps[i] as any).dayIndex as number | null | undefined;
      if (typeof raw === "number" && raw >= 1) {
        currentDay = raw;
      }
      effectiveDays[i] = currentDay;
    }

    const maxDay = Math.max(...effectiveDays, 1);

    const trackFragments: { day: number; wps: typeof wps }[] = [];
    for (let day = 1; day <= maxDay; day++) {
      const dayWps = wps.filter((_, idx) => effectiveDays[idx] === day);
      if (dayWps.length === 0) continue;
      trackFragments.push({ day, wps: dayWps });
    }

    const tripName = trip.name ?? "Trip";
    const safeTripName = escapeXml(tripName);
    const metaTime = (trip.startDate ?? new Date()).toISOString();

    let gpx = '';
    gpx += '<?xml version="1.0" encoding="UTF-8"?>\n';
    gpx +=
      '<gpx version="1.1" creator="World Moto Trip Planner" xmlns="http://www.topografix.com/GPX/1/1">\n';
    gpx += `  <metadata>\n`;
    gpx += `    <name>${safeTripName}</name>\n`;
    if (trip.description) {
      gpx += `    <desc>${escapeXml(trip.description)}</desc>\n`;
    }
    gpx += `    <time>${metaTime}</time>\n`;
    gpx += `  </metadata>\n`;

    for (const fragment of trackFragments) {
      const label = `${safeTripName} - Day ${fragment.day}`;
      gpx += `  <trk>\n`;
      gpx += `    <name>${label}</name>\n`;
      gpx += `    <trkseg>\n`;
      for (const wp of fragment.wps) {
        const lat = wp.lat.toFixed(6);
        const lon = wp.lng.toFixed(6);
        gpx += `      <trkpt lat="${lat}" lon="${lon}">`;
        const wpName = wp.name || undefined;
        if (wpName) {
          gpx += `<name>${escapeXml(wpName)}</name>`;
        }
        gpx += `</trkpt>\n`;
      }
      gpx += `    </trkseg>\n`;
      gpx += `  </trk>\n`;
    }

    gpx += '</gpx>\n';

    const fileNameBase = tripName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      || "trip";

    return new NextResponse(gpx, {
      status: 200,
      headers: {
        "Content-Type": "application/gpx+xml; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileNameBase}.gpx"`,
      },
    });
  } catch (error) {
    console.error("Error exporting GPX", error);
    return NextResponse.json({ error: "Failed to export GPX" }, { status: 500 });
  }
}
